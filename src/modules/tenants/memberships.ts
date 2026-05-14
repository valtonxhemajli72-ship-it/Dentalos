import { maskEmail } from "@/lib/privacy";
import { assertTenantAccess, type TenantContext, type TenantRole } from "@/modules/tenants";
import { assertPermission } from "@/server/auth/permissions";
import { getPrismaClient } from "@/server/db";

type MembershipUserRecord = {
  id: string;
  email: string;
  name?: string | null;
};

type MembershipTenantRecord = {
  id: string;
  name: string;
};

type MembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  deactivatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  tenant?: MembershipTenantRecord;
  user?: MembershipUserRecord;
};

type MembershipRepositoryDatabase = {
  membership: {
    findMany(args: Record<string, unknown>): Promise<MembershipRecord[]>;
    findFirst(args: Record<string, unknown>): Promise<MembershipRecord | null>;
    update(args: Record<string, unknown>): Promise<MembershipRecord>;
    count(args: Record<string, unknown>): Promise<number>;
  };
};

type MembershipRepositoryOptions = {
  db?: MembershipRepositoryDatabase;
};

export type TenantMembershipListItem = {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userDisplayName: string;
  userEmailMasked: string;
  role: TenantRole;
  createdAt?: Date;
  deactivatedAt?: Date | null;
};

export type TenantMembershipOption = {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  role: TenantRole;
};

export async function listMembershipsForTenant(
  tenantId: string,
  actorContext: TenantContext,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipListItem[]> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "user:read");

  const db = getMembershipDb(options);
  const memberships = await db.membership.findMany({
    where: {
      tenantId,
      deactivatedAt: null,
    },
    include: {
      user: true,
      tenant: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships.map(mapMembershipRecordToListItem);
}

export async function getMembershipForUser(
  tenantId: string,
  userId: string,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipOption | null> {
  const db = getMembershipDb(options);
  const membership = await db.membership.findFirst({
    where: {
      tenantId,
      userId,
      deactivatedAt: null,
    },
    include: {
      tenant: true,
    },
  });

  return membership ? mapMembershipRecordToOption(membership) : null;
}

export async function listTenantsForUser(
  userId: string,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipOption[]> {
  const db = getMembershipDb(options);
  const memberships = await db.membership.findMany({
    where: {
      userId,
      deactivatedAt: null,
    },
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map(mapMembershipRecordToOption);
}

export async function requireTenantMembership(
  tenantId: string,
  userId: string,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipOption> {
  const membership = await getMembershipForUser(tenantId, userId, options);

  if (!membership) {
    throw new Error("Tenant membership is required.");
  }

  return membership;
}

export async function updateMembershipRole(
  tenantId: string,
  membershipId: string,
  role: TenantRole,
  actorContext: TenantContext,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipListItem> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "membership:update");
  assertRoleCanBeAssignedByActor(actorContext.role, role);

  const db = getMembershipDb(options);
  const target = await requireMembershipRecordForTenant(db, tenantId, membershipId);
  assertActorCanManageTargetRole(actorContext.role, target.role);

  if (target.role === "OWNER" && role !== "OWNER") {
    await assertTenantWillStillHaveOwner(db, tenantId);
  }

  const updated = await db.membership.update({
    where: {
      id: membershipId,
    },
    data: {
      role,
    },
    include: {
      user: true,
      tenant: true,
    },
  });

  return mapMembershipRecordToListItem(updated);
}

export async function deactivateMembership(
  tenantId: string,
  membershipId: string,
  actorContext: TenantContext,
  options: MembershipRepositoryOptions = {},
): Promise<TenantMembershipListItem> {
  assertTenantAccess(actorContext, tenantId);
  assertPermission(actorContext.role, "membership:deactivate");

  const db = getMembershipDb(options);
  const target = await requireMembershipRecordForTenant(db, tenantId, membershipId);

  if (target.userId === actorContext.userId) {
    throw new Error("Users cannot deactivate their own membership.");
  }

  assertActorCanManageTargetRole(actorContext.role, target.role);

  if (target.role === "OWNER") {
    await assertTenantWillStillHaveOwner(db, tenantId);
  }

  const updated = await db.membership.update({
    where: {
      id: membershipId,
    },
    data: {
      deactivatedAt: new Date(),
    },
    include: {
      user: true,
      tenant: true,
    },
  });

  return mapMembershipRecordToListItem(updated);
}

export function isManageableRoleForActor(actorRole: TenantRole, targetRole: TenantRole): boolean {
  if (actorRole === "OWNER") {
    return true;
  }

  return actorRole === "ADMIN" && targetRole !== "OWNER";
}

function getMembershipDb(options: MembershipRepositoryOptions): MembershipRepositoryDatabase {
  return (options.db ?? getPrismaClient()) as unknown as MembershipRepositoryDatabase;
}

async function requireMembershipRecordForTenant(
  db: MembershipRepositoryDatabase,
  tenantId: string,
  membershipId: string,
): Promise<MembershipRecord> {
  const membership = await db.membership.findFirst({
    where: {
      id: membershipId,
      tenantId,
      deactivatedAt: null,
    },
    include: {
      user: true,
      tenant: true,
    },
  });

  if (!membership) {
    throw new Error("Membership was not found for this tenant.");
  }

  return membership;
}

async function assertTenantWillStillHaveOwner(
  db: MembershipRepositoryDatabase,
  tenantId: string,
): Promise<void> {
  const ownerCount = await db.membership.count({
    where: {
      tenantId,
      role: "OWNER",
      deactivatedAt: null,
    },
  });

  if (ownerCount <= 1) {
    throw new Error("A tenant must always keep at least one active owner.");
  }
}

function assertActorCanManageTargetRole(actorRole: TenantRole, targetRole: TenantRole): void {
  if (!isManageableRoleForActor(actorRole, targetRole)) {
    throw new Error("Actor role cannot manage the target membership role.");
  }
}

function assertRoleCanBeAssignedByActor(actorRole: TenantRole, targetRole: TenantRole): void {
  if (!isManageableRoleForActor(actorRole, targetRole)) {
    throw new Error("Actor role cannot assign the requested role.");
  }
}

function mapMembershipRecordToOption(record: MembershipRecord): TenantMembershipOption {
  return {
    membershipId: record.id,
    tenantId: record.tenantId,
    tenantName: record.tenant?.name ?? "Selected clinic",
    role: record.role,
  };
}

function mapMembershipRecordToListItem(record: MembershipRecord): TenantMembershipListItem {
  return {
    membershipId: record.id,
    tenantId: record.tenantId,
    tenantName: record.tenant?.name ?? "Selected clinic",
    userId: record.userId,
    userDisplayName: record.user?.name ?? "Team member",
    userEmailMasked: record.user?.email ? maskEmail(record.user.email) : "Email unavailable",
    role: record.role,
    createdAt: record.createdAt,
    deactivatedAt: record.deactivatedAt,
  };
}
