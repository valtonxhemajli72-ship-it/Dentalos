export type BootstrapFirstTenantOwnerInput = {
  tenantName?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  requestedAt?: Date;
};

export type NormalizedBootstrapInput = {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerName: string;
  requestedAt: Date;
};

export type BootstrapEntityState = "created" | "reused" | "reactivated";

export type BootstrapFirstTenantOwnerResult = {
  tenantId: string;
  tenantSlug: string;
  tenantState: Exclude<BootstrapEntityState, "reactivated">;
  userId: string;
  userState: Exclude<BootstrapEntityState, "reactivated">;
  membershipId: string;
  membershipState: BootstrapEntityState;
  setupStatus: "BOOTSTRAPPED";
  setupStateChanged: boolean;
  auditEventsWritten: number;
};

export class BootstrapInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapInputError";
  }
}

export class BootstrapConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapConflictError";
  }
}

type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  setupStatus?: "PENDING" | "BOOTSTRAPPED";
  setupCompletedAt?: Date | null;
};

type UserRecord = {
  id: string;
  email: string;
  name?: string | null;
};

type MembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  deactivatedAt?: Date | null;
};

type BootstrapTenantDelegate = {
  findUnique(args: Record<string, unknown>): Promise<TenantRecord | null>;
  create(args: Record<string, unknown>): Promise<TenantRecord>;
  update(args: Record<string, unknown>): Promise<TenantRecord>;
};

type BootstrapUserDelegate = {
  findUnique(args: Record<string, unknown>): Promise<UserRecord | null>;
  create(args: Record<string, unknown>): Promise<UserRecord>;
};

type BootstrapMembershipDelegate = {
  findUnique(args: Record<string, unknown>): Promise<MembershipRecord | null>;
  findMany(args: Record<string, unknown>): Promise<MembershipRecord[]>;
  create(args: Record<string, unknown>): Promise<MembershipRecord>;
  update(args: Record<string, unknown>): Promise<MembershipRecord>;
};

type BootstrapAuditLogDelegate = {
  create(args: Record<string, unknown>): Promise<unknown>;
};

export type BootstrapTransactionClient = {
  tenant: BootstrapTenantDelegate;
  user: BootstrapUserDelegate;
  membership: BootstrapMembershipDelegate;
  auditLog: BootstrapAuditLogDelegate;
};

export type BootstrapDatabaseClient = BootstrapTransactionClient & {
  $transaction<T>(fn: (transaction: BootstrapTransactionClient) => Promise<T>): Promise<T>;
};

type EntityResult<TRecord, TState extends BootstrapEntityState = BootstrapEntityState> = {
  record: TRecord;
  state: TState;
};

export function validateBootstrapInput(
  input: BootstrapFirstTenantOwnerInput,
): NormalizedBootstrapInput {
  const tenantName = normalizeRequiredText(input.tenantName, "Bootstrap tenant name", 2, 120);
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const ownerName = normalizeRequiredText(input.ownerName, "Bootstrap owner name", 2, 120);
  const tenantSlug = createTenantSlug(tenantName);

  if (!tenantSlug) {
    throw new BootstrapInputError(
      "Bootstrap tenant name must include letters or numbers usable for a clinic slug.",
    );
  }

  return {
    tenantName,
    tenantSlug,
    ownerEmail,
    ownerName,
    requestedAt: input.requestedAt ?? new Date(),
  };
}

export async function bootstrapFirstTenantOwner(
  input: BootstrapFirstTenantOwnerInput,
  options: { db: BootstrapDatabaseClient },
): Promise<BootstrapFirstTenantOwnerResult> {
  const normalized = validateBootstrapInput(input);
  let tenantIdForFailureAudit: string | undefined;

  try {
    return await options.db.$transaction(async (transaction) => {
      const tenant = await ensureTenantExists(transaction, normalized);
      tenantIdForFailureAudit = tenant.record.id;

      const user = await ensureUserExists(transaction, normalized);

      await writeBootstrapAuditEvent(transaction, {
        tenantId: tenant.record.id,
        actorUserId: user.record.id,
        action: "tenant.bootstrap_started",
        entityType: "Tenant",
        entityId: tenant.record.id,
        metadata: {
          tenantId: tenant.record.id,
          userId: user.record.id,
          status: "started",
          tenantCreated: tenant.state === "created",
          userCreated: user.state === "created",
        },
        createdAt: normalized.requestedAt,
      });

      const membership = await ensureOwnerMembershipExists(
        transaction,
        tenant.record.id,
        user.record.id,
      );
      const setup = await ensureTenantSetupCompleted(
        transaction,
        tenant.record,
        normalized.requestedAt,
      );

      await writeBootstrapAuditEvent(transaction, {
        tenantId: tenant.record.id,
        actorUserId: user.record.id,
        action: "membership.owner_bootstrapped",
        entityType: "Membership",
        entityId: membership.record.id,
        metadata: {
          tenantId: tenant.record.id,
          userId: user.record.id,
          membershipId: membership.record.id,
          status: "active",
          membershipCreated: membership.state === "created",
          membershipReactivated: membership.state === "reactivated",
        },
        createdAt: normalized.requestedAt,
      });

      await writeBootstrapAuditEvent(transaction, {
        tenantId: tenant.record.id,
        actorUserId: user.record.id,
        action: "tenant.bootstrap_completed",
        entityType: "Tenant",
        entityId: tenant.record.id,
        metadata: {
          tenantId: tenant.record.id,
          userId: user.record.id,
          membershipId: membership.record.id,
          status: "completed",
          tenantCreated: tenant.state === "created",
          userCreated: user.state === "created",
          membershipCreated: membership.state === "created",
          membershipReactivated: membership.state === "reactivated",
          setupStateChanged: setup.changed,
        },
        createdAt: normalized.requestedAt,
      });

      return {
        tenantId: tenant.record.id,
        tenantSlug: tenant.record.slug,
        tenantState: tenant.state,
        userId: user.record.id,
        userState: user.state,
        membershipId: membership.record.id,
        membershipState: membership.state,
        setupStatus: "BOOTSTRAPPED",
        setupStateChanged: setup.changed,
        auditEventsWritten: 3,
      };
    });
  } catch (error) {
    await writeBootstrapFailureAuditIfPossible(options.db, {
      tenantId: tenantIdForFailureAudit,
      actionAt: normalized.requestedAt,
      reason: classifyBootstrapFailure(error),
    });

    throw error;
  }
}

export async function ensureTenantExists(
  db: BootstrapTransactionClient,
  input: NormalizedBootstrapInput,
): Promise<EntityResult<TenantRecord, "created" | "reused">> {
  const existingTenant = await db.tenant.findUnique({
    where: {
      slug: input.tenantSlug,
    },
  });

  if (existingTenant) {
    if (!isSameClinicName(existingTenant.name, input.tenantName)) {
      throw new BootstrapConflictError(
        "A tenant already exists for the generated clinic slug. Bootstrap refused.",
      );
    }

    return {
      record: existingTenant,
      state: "reused",
    };
  }

  const tenant = await db.tenant.create({
    data: {
      name: input.tenantName,
      slug: input.tenantSlug,
      setupStatus: "PENDING",
    },
  });

  return {
    record: tenant,
    state: "created",
  };
}

export async function ensureUserExists(
  db: BootstrapTransactionClient,
  input: NormalizedBootstrapInput,
): Promise<EntityResult<UserRecord, "created" | "reused">> {
  const existingUser = await db.user.findUnique({
    where: {
      email: input.ownerEmail,
    },
  });

  if (existingUser) {
    return {
      record: existingUser,
      state: "reused",
    };
  }

  const user = await db.user.create({
    data: {
      email: input.ownerEmail,
      name: input.ownerName,
    },
  });

  return {
    record: user,
    state: "created",
  };
}

export async function ensureOwnerMembershipExists(
  db: BootstrapTransactionClient,
  tenantId: string,
  userId: string,
): Promise<EntityResult<MembershipRecord>> {
  if (!tenantId || !userId) {
    throw new BootstrapInputError("Bootstrap owner membership requires tenant and user IDs.");
  }

  const existingMembership = await db.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  const activeOwners = await db.membership.findMany({
    where: {
      tenantId,
      role: "OWNER",
      deactivatedAt: null,
    },
  });

  if (activeOwners.some((owner) => owner.userId !== userId)) {
    throw new BootstrapConflictError(
      "The target tenant already has a different active owner. Bootstrap refused.",
    );
  }

  if (existingMembership) {
    if (existingMembership.role !== "OWNER") {
      throw new BootstrapConflictError(
        "The bootstrap user already has a non-owner membership. Bootstrap refused.",
      );
    }

    if (existingMembership.deactivatedAt) {
      const reactivatedMembership = await db.membership.update({
        where: {
          id: existingMembership.id,
        },
        data: {
          deactivatedAt: null,
        },
      });

      return {
        record: reactivatedMembership,
        state: "reactivated",
      };
    }

    return {
      record: existingMembership,
      state: "reused",
    };
  }

  const membership = await db.membership.create({
    data: {
      tenantId,
      userId,
      role: "OWNER",
    },
  });

  return {
    record: membership,
    state: "created",
  };
}

function createTenantSlug(tenantName: string): string {
  return tenantName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}

function normalizeRequiredText(
  value: string | null | undefined,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";

  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new BootstrapInputError(
      `${label} must be between ${minLength} and ${maxLength} characters.`,
    );
  }

  return normalized;
}

function normalizeEmail(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new BootstrapInputError("Bootstrap owner email must be a valid email address.");
  }

  return normalized;
}

function isSameClinicName(existingName: string, requestedName: string): boolean {
  return existingName.trim().replace(/\s+/g, " ") === requestedName.trim().replace(/\s+/g, " ");
}

async function ensureTenantSetupCompleted(
  db: BootstrapTransactionClient,
  tenant: TenantRecord,
  completedAt: Date,
): Promise<{ record: TenantRecord; changed: boolean }> {
  if (tenant.setupStatus === "BOOTSTRAPPED" && tenant.setupCompletedAt) {
    return {
      record: tenant,
      changed: false,
    };
  }

  const updatedTenant = await db.tenant.update({
    where: {
      id: tenant.id,
    },
    data: {
      setupStatus: "BOOTSTRAPPED",
      setupCompletedAt: tenant.setupCompletedAt ?? completedAt,
    },
  });

  return {
    record: updatedTenant,
    changed: true,
  };
}

async function writeBootstrapAuditEvent(
  db: BootstrapTransactionClient,
  event: {
    tenantId: string;
    actorUserId?: string;
    action:
      | "tenant.bootstrap_started"
      | "tenant.bootstrap_completed"
      | "tenant.bootstrap_failed"
      | "membership.owner_bootstrapped";
    entityType: "Tenant" | "Membership";
    entityId?: string;
    metadata: Record<string, string | number | boolean | null>;
    createdAt: Date;
  },
): Promise<void> {
  assertSafeBootstrapAuditMetadata(event.metadata);

  await db.auditLog.create({
    data: {
      tenantId: event.tenantId,
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      createdAt: event.createdAt,
    },
  });
}

function assertSafeBootstrapAuditMetadata(
  metadata: Record<string, string | number | boolean | null>,
): void {
  const unsafeKeyPattern = /(name|email|phone|note|message|body|raw|csv|secret|token|password)/i;
  const emailValuePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneValuePattern = /(?:\+?\d[\d\s().-]{6,}\d)/;

  for (const [key, value] of Object.entries(metadata)) {
    if (unsafeKeyPattern.test(key)) {
      throw new BootstrapInputError("Bootstrap audit metadata contains an unsafe key.");
    }

    if (
      typeof value === "string" &&
      (emailValuePattern.test(value) || phoneValuePattern.test(value))
    ) {
      throw new BootstrapInputError("Bootstrap audit metadata contains an unsafe value.");
    }
  }
}

async function writeBootstrapFailureAuditIfPossible(
  db: BootstrapDatabaseClient,
  input: { tenantId?: string; actionAt: Date; reason: string },
): Promise<void> {
  if (!input.tenantId) {
    return;
  }

  try {
    await writeBootstrapAuditEvent(db, {
      tenantId: input.tenantId,
      action: "tenant.bootstrap_failed",
      entityType: "Tenant",
      entityId: input.tenantId,
      metadata: {
        tenantId: input.tenantId,
        status: "failed",
        reason: input.reason,
      },
      createdAt: input.actionAt,
    });
  } catch {
    // Best-effort only. The CLI still fails closed and avoids printing raw database errors.
  }
}

function classifyBootstrapFailure(error: unknown): string {
  if (error instanceof BootstrapInputError) {
    return "validation_failed";
  }

  if (error instanceof BootstrapConflictError) {
    return "conflict";
  }

  return "bootstrap_failed";
}
