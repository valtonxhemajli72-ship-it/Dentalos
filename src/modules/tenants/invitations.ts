import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { maskEmail } from "@/lib/privacy";
import { assertTenantAccess, type TenantContext, type TenantRole } from "@/modules/tenants";
import { isManageableRoleForActor } from "@/modules/tenants/memberships";
import { assertPermission } from "@/server/auth/permissions";
import { getPrismaClient } from "@/server/db";

type TenantInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type TenantInvitationRecord = {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  status: TenantInvitationStatus;
  tokenHash?: string;
  invitedByUserId?: string;
  acceptedByUserId?: string | null;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  tenant?: {
    id: string;
    name: string;
  };
};

type MembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  deactivatedAt?: Date | null;
};

type InvitationUserRecord = {
  id: string;
  email: string;
  name?: string | null;
};

type TenantInvitationRepositoryDatabase = {
  tenantInvitation: {
    findMany(args: Record<string, unknown>): Promise<TenantInvitationRecord[]>;
    findFirst(args: Record<string, unknown>): Promise<TenantInvitationRecord | null>;
    create(args: Record<string, unknown>): Promise<TenantInvitationRecord>;
    update(args: Record<string, unknown>): Promise<TenantInvitationRecord>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  membership: {
    findFirst(args: Record<string, unknown>): Promise<MembershipRecord | null>;
    create(args: Record<string, unknown>): Promise<MembershipRecord>;
    update(args: Record<string, unknown>): Promise<MembershipRecord>;
  };
  user: {
    findUnique(args: Record<string, unknown>): Promise<InvitationUserRecord | null>;
    create(args: Record<string, unknown>): Promise<InvitationUserRecord>;
  };
};

type TenantInvitationDatabase = TenantInvitationRepositoryDatabase & {
  $transaction?<T>(
    callback: (transaction: TenantInvitationRepositoryDatabase) => Promise<T>,
  ): Promise<T>;
};

type TenantInvitationOptions = {
  db?: TenantInvitationDatabase;
};

export type TenantInvitationListItem = {
  invitationId: string;
  tenantId: string;
  emailMasked: string;
  role: TenantRole;
  status: TenantInvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
};

export type TenantInvitationCreationResult = TenantInvitationListItem & {
  deliveryToken: string;
};

export type TenantInvitationLookupItem = TenantInvitationListItem & {
  tenantName?: string;
};

export type InvitationAcceptancePreviewStatus =
  | "ready"
  | "invalid"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "email_mismatch"
  | "owner_role_blocked";

export type InvitationAcceptancePreview = {
  status: InvitationAcceptancePreviewStatus;
  invitation?: TenantInvitationLookupItem;
};

export type InvitationAcceptanceStatus =
  | "accepted"
  | "already_member"
  | "invalid"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "email_mismatch"
  | "owner_role_blocked";

export type InvitationAcceptanceResult = {
  status: InvitationAcceptanceStatus;
  tenantId?: string;
  tenantName?: string;
  invitationId?: string;
  membershipId?: string;
  actorUserId?: string;
  role?: TenantRole;
  membershipCreated?: boolean;
  membershipReactivated?: boolean;
};

export async function createTenantInvitation(
  input: {
    tenantId: string;
    email: string;
    role?: TenantRole;
    expiresAt?: Date;
  },
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationCreationResult> {
  assertTenantAccess(actorContext, input.tenantId);
  assertPermission(actorContext.role, "invitation:create");

  const role = input.role ?? "STAFF";
  assertRoleCanBeInvited(actorContext.role, role);

  const email = normalizeInvitationEmail(input.email);
  const rawToken = generateInvitationToken();
  const db = getInvitationDb(options);
  const invitation = await db.tenantInvitation.create({
    data: {
      tenantId: input.tenantId,
      email,
      role,
      status: "PENDING",
      tokenHash: hashInvitationToken(rawToken),
      invitedByUserId: actorContext.userId,
      expiresAt: input.expiresAt ?? defaultInvitationExpiry(),
    },
  });

  return {
    ...mapInvitationRecordToListItem(invitation),
    deliveryToken: rawToken,
  };
}

export async function listTenantInvitations(
  tenantId: string,
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationListItem[]> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "user:read");

  const db = getInvitationDb(options);
  const invitations = await db.tenantInvitation.findMany({
    where: {
      tenantId,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return invitations.map(mapInvitationRecordToListItem);
}

export async function revokeTenantInvitation(
  tenantId: string,
  invitationId: string,
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationListItem> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "invitation:revoke");

  const db = getInvitationDb(options);
  const invitation = await requireInvitationForTenant(db, tenantId, invitationId);

  if (invitation.status !== "PENDING") {
    throw new Error("Only pending invitations can be revoked.");
  }

  const updateResult = await db.tenantInvitation.updateMany({
    where: {
      id: invitationId,
      tenantId,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });
  assertSingleTenantMutation(updateResult.count);

  const updated = await requireInvitationForTenant(db, tenantId, invitationId);
  return mapInvitationRecordToListItem(updated);
}

export async function getInvitationByTokenHash(
  tokenHash: string,
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationLookupItem | null> {
  if (!isValidInvitationTokenHash(tokenHash)) {
    return null;
  }

  const db = getInvitationDb(options);
  const invitation = await db.tenantInvitation.findFirst({
    where: {
      tokenHash,
    },
    include: {
      tenant: true,
    },
  });

  return invitation ? mapInvitationRecordToLookupItem(invitation) : null;
}

export async function getInvitationAcceptancePreview(
  rawInvitationToken: string,
  acceptedBy: { email: string },
  options: TenantInvitationOptions = {},
): Promise<InvitationAcceptancePreview> {
  const invitation = await getInvitationRecordForToken(rawInvitationToken, options);

  if (!invitation) {
    return { status: "invalid" };
  }

  const validationStatus = getInvitationValidationStatus(invitation, acceptedBy.email, new Date());

  return {
    status: validationStatus === "pending" ? "ready" : validationStatus,
    invitation: mapInvitationRecordToLookupItem(invitation),
  };
}

export async function acceptTenantInvitation(
  input: {
    rawInvitationToken: string;
    authenticatedUser: {
      id: string;
      email: string;
      name?: string;
      isProvisioned?: boolean;
    };
    now?: Date;
  },
  options: TenantInvitationOptions = {},
): Promise<InvitationAcceptanceResult> {
  const db = getInvitationDb(options);
  const run = (transaction: TenantInvitationRepositoryDatabase) =>
    acceptTenantInvitationInTransaction(transaction, input);

  return db.$transaction ? db.$transaction(run) : run(db);
}

export async function markExpiredInvitationsForTenant(
  tenantId: string,
  options: TenantInvitationOptions = {},
): Promise<{ count: number }> {
  const db = getInvitationDb(options);
  return db.tenantInvitation.updateMany({
    where: {
      tenantId,
      status: "PENDING",
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

export async function markExpiredInvitations(
  tenantId: string,
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<{ count: number }> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "invitation:revoke");

  return markExpiredInvitationsForTenant(tenantId, options);
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashInvitationToken(rawInvitationToken: string): string {
  return createHash("sha256").update(normalizeInvitationToken(rawInvitationToken)).digest("hex");
}

export function verifyInvitationToken(rawInvitationToken: string, tokenHash: string): boolean {
  if (!isValidInvitationTokenHash(tokenHash)) {
    return false;
  }

  const candidateHash = hashInvitationToken(rawInvitationToken);
  const candidate = Buffer.from(candidateHash, "hex");
  const expected = Buffer.from(tokenHash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function getInvitationDb(options: TenantInvitationOptions): TenantInvitationDatabase {
  return (options.db ?? getPrismaClient()) as unknown as TenantInvitationDatabase;
}

async function acceptTenantInvitationInTransaction(
  db: TenantInvitationRepositoryDatabase,
  input: Parameters<typeof acceptTenantInvitation>[0],
): Promise<InvitationAcceptanceResult> {
  const invitation = await getInvitationRecordForToken(input.rawInvitationToken, { db });

  if (!invitation) {
    return { status: "invalid" };
  }

  const now = input.now ?? new Date();
  const validationStatus = getInvitationValidationStatus(
    invitation,
    input.authenticatedUser.email,
    now,
  );

  if (validationStatus === "expired" && invitation.status === "PENDING") {
    const expired = await db.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "EXPIRED",
      },
      include: {
        tenant: true,
      },
    });

    return buildAcceptanceResult("expired", expired);
  }

  if (validationStatus !== "pending") {
    return buildAcceptanceResult(validationStatus, invitation);
  }

  const user = await findOrCreateInvitationUser(db, input.authenticatedUser);
  const existingMembership = await db.membership.findFirst({
    where: {
      tenantId: invitation.tenantId,
      userId: user.id,
    },
  });

  let membership = existingMembership;
  let status: InvitationAcceptanceStatus = "accepted";
  let membershipCreated = false;
  let membershipReactivated = false;

  if (existingMembership?.deactivatedAt) {
    membership = await db.membership.update({
      where: { id: existingMembership.id },
      data: {
        role: invitation.role,
        deactivatedAt: null,
      },
    });
    membershipReactivated = true;
  } else if (existingMembership) {
    status = "already_member";
  } else {
    membership = await db.membership.create({
      data: {
        tenantId: invitation.tenantId,
        userId: user.id,
        role: invitation.role,
      },
    });
    membershipCreated = true;
  }

  const accepted = await db.tenantInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedByUserId: user.id,
      acceptedAt: now,
    },
    include: {
      tenant: true,
    },
  });

  return {
    ...buildAcceptanceResult(status, accepted),
    actorUserId: user.id,
    membershipId: membership?.id,
    membershipCreated,
    membershipReactivated,
  };
}

async function getInvitationRecordForToken(
  rawInvitationToken: string,
  options: TenantInvitationOptions,
): Promise<TenantInvitationRecord | null> {
  const normalizedToken = normalizeInvitationToken(rawInvitationToken);

  if (!normalizedToken) {
    return null;
  }

  const tokenHash = hashInvitationToken(normalizedToken);
  const db = getInvitationDb(options);
  const invitation = await db.tenantInvitation.findFirst({
    where: {
      tokenHash,
    },
    include: {
      tenant: true,
    },
  });

  if (!invitation?.tokenHash || !verifyInvitationToken(normalizedToken, invitation.tokenHash)) {
    return null;
  }

  return invitation;
}

async function findOrCreateInvitationUser(
  db: TenantInvitationRepositoryDatabase,
  authenticatedUser: { email: string; name?: string },
): Promise<InvitationUserRecord> {
  const email = normalizeInvitationEmail(authenticatedUser.email);
  const existing = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    return existing;
  }

  return db.user.create({
    data: {
      email,
      name: authenticatedUser.name,
    },
  });
}

function buildAcceptanceResult(
  status: InvitationAcceptanceStatus,
  invitation: TenantInvitationRecord,
): InvitationAcceptanceResult {
  return {
    status,
    tenantId: invitation.tenantId,
    tenantName: invitation.tenant?.name,
    invitationId: invitation.id,
    actorUserId: invitation.acceptedByUserId ?? undefined,
    role: invitation.role,
  };
}

function getInvitationValidationStatus(
  invitation: TenantInvitationRecord,
  authenticatedEmail: string,
  now: Date,
): Exclude<InvitationAcceptancePreviewStatus, "ready"> | "pending" {
  if (invitation.status === "ACCEPTED") {
    return "already_accepted";
  }

  if (invitation.status === "REVOKED") {
    return "revoked";
  }

  if (invitation.status === "EXPIRED" || invitation.expiresAt <= now) {
    return "expired";
  }

  if (invitation.role === "OWNER") {
    return "owner_role_blocked";
  }

  if (normalizeInvitationEmail(authenticatedEmail) !== normalizeInvitationEmail(invitation.email)) {
    return "email_mismatch";
  }

  return "pending";
}

function defaultInvitationExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  return expiresAt;
}

function normalizeInvitationEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("A valid staff email address is required.");
  }

  return normalized;
}

function normalizeInvitationToken(rawInvitationToken: string): string {
  return rawInvitationToken.trim();
}

function isValidInvitationTokenHash(tokenHash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(tokenHash);
}

async function requireInvitationForTenant(
  db: TenantInvitationDatabase,
  tenantId: string,
  invitationId: string,
): Promise<TenantInvitationRecord> {
  const invitation = await db.tenantInvitation.findFirst({
    where: {
      id: invitationId,
      tenantId,
    },
  });

  if (!invitation) {
    throw new Error("Invitation was not found for this tenant.");
  }

  return invitation;
}

function assertSingleTenantMutation(count: number): void {
  if (count !== 1) {
    throw new Error("Tenant-scoped invitation mutation did not update exactly one record.");
  }
}

function assertRoleCanBeInvited(actorRole: TenantRole, invitedRole: TenantRole): void {
  if (invitedRole === "OWNER") {
    throw new Error("Owner invitations require a separate reviewed owner transfer workflow.");
  }

  if (invitedRole === "CLINICIAN") {
    throw new Error("Use DOCTOR for new clinical staff invitations.");
  }

  if (!isManageableRoleForActor(actorRole, invitedRole)) {
    throw new Error("Actor role cannot invite the requested role.");
  }
}

function mapInvitationRecordToLookupItem(
  invitation: TenantInvitationRecord,
): TenantInvitationLookupItem {
  return {
    ...mapInvitationRecordToListItem(invitation),
    tenantName: invitation.tenant?.name,
  };
}

function mapInvitationRecordToListItem(
  invitation: TenantInvitationRecord,
): TenantInvitationListItem {
  return {
    invitationId: invitation.id,
    tenantId: invitation.tenantId,
    emailMasked: maskEmail(invitation.email),
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
  };
}
