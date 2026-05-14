import { createHash, randomBytes } from "node:crypto";
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
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
};

type MembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  deactivatedAt?: Date | null;
};

type TenantInvitationDatabase = {
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

export async function createTenantInvitation(
  input: {
    tenantId: string;
    email: string;
    role?: TenantRole;
    expiresAt?: Date;
  },
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationListItem> {
  assertTenantAccess(actorContext, input.tenantId);
  assertPermission(actorContext.role, "invitation:create");

  const role = input.role ?? "STAFF";
  assertRoleCanBeInvited(actorContext.role, role);

  const email = normalizeInvitationEmail(input.email);
  const db = getInvitationDb(options);
  const invitation = await db.tenantInvitation.create({
    data: {
      tenantId: input.tenantId,
      email,
      role,
      status: "PENDING",
      tokenHash: createInvitationTokenHash(),
      invitedByUserId: actorContext.userId,
      expiresAt: input.expiresAt ?? defaultInvitationExpiry(),
    },
  });

  return mapInvitationRecordToListItem(invitation);
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

  const updated = await db.tenantInvitation.update({
    where: {
      id: invitationId,
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  return mapInvitationRecordToListItem(updated);
}

export async function acceptTenantInvitation(
  rawInvitationToken: string,
  acceptedBy: { userId: string; email: string },
  options: TenantInvitationOptions = {},
): Promise<TenantInvitationListItem> {
  const db = getInvitationDb(options);
  const tokenHash = hashInvitationToken(rawInvitationToken);
  const invitation = await db.tenantInvitation.findFirst({
    where: {
      tokenHash,
      status: "PENDING",
    },
  });

  if (!invitation) {
    throw new Error("Invitation was not found or is no longer pending.");
  }

  if (invitation.expiresAt < new Date()) {
    const expired = await db.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "EXPIRED",
      },
    });
    return mapInvitationRecordToListItem(expired);
  }

  if (normalizeInvitationEmail(acceptedBy.email) !== invitation.email) {
    throw new Error("Invitation email does not match the authenticated user.");
  }

  const existingMembership = await db.membership.findFirst({
    where: {
      tenantId: invitation.tenantId,
      userId: acceptedBy.userId,
    },
  });

  if (existingMembership) {
    await db.membership.update({
      where: { id: existingMembership.id },
      data: {
        role: invitation.role,
        deactivatedAt: null,
      },
    });
  } else {
    await db.membership.create({
      data: {
        tenantId: invitation.tenantId,
        userId: acceptedBy.userId,
        role: invitation.role,
      },
    });
  }

  const accepted = await db.tenantInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedByUserId: acceptedBy.userId,
      acceptedAt: new Date(),
    },
  });

  return mapInvitationRecordToListItem(accepted);
}

export async function markExpiredInvitations(
  tenantId: string,
  actorContext: TenantContext,
  options: TenantInvitationOptions = {},
): Promise<{ count: number }> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "invitation:revoke");

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

export function hashInvitationToken(rawInvitationToken: string): string {
  return createHash("sha256").update(rawInvitationToken).digest("hex");
}

function getInvitationDb(options: TenantInvitationOptions): TenantInvitationDatabase {
  return (options.db ?? getPrismaClient()) as unknown as TenantInvitationDatabase;
}

function createInvitationTokenHash(): string {
  return hashInvitationToken(randomBytes(32).toString("hex"));
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

function assertRoleCanBeInvited(actorRole: TenantRole, invitedRole: TenantRole): void {
  if (invitedRole === "CLINICIAN") {
    throw new Error("Use DOCTOR for new clinical staff invitations.");
  }

  if (!isManageableRoleForActor(actorRole, invitedRole)) {
    throw new Error("Actor role cannot invite the requested role.");
  }
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
