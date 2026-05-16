export type TenantRole =
  | "OWNER"
  | "ADMIN"
  | "DOCTOR"
  | "RECEPTIONIST"
  | "MANAGER"
  | "CLINICIAN"
  | "STAFF";

export type TenantContext = {
  tenantId: string;
  userId: string;
  userEmail?: string;
  membershipId: string;
  role: TenantRole;
  tenantName?: string;
};

export const tenantOwnedModels = [
  "Patient",
  "Appointment",
  "RecallCampaign",
  "RecallCampaignPatient",
  "NotificationMessage",
  "PatientImportBatch",
  "TenantInvitation",
  "AuditLog",
] as const;

export type TenantOwnedModel = (typeof tenantOwnedModels)[number];

export function assertTenantContext(
  context: TenantContext | null,
): asserts context is TenantContext {
  if (!context?.tenantId || !context.userId || !context.membershipId) {
    throw new Error("Tenant context is required.");
  }
}

export function requireTenantId(context: TenantContext | null | undefined): string {
  const tenantContext = context ?? null;
  assertTenantContext(tenantContext);
  return tenantContext.tenantId;
}

export function assertTenantAccess(
  context: TenantContext | null | undefined,
  tenantId: string,
): asserts context is TenantContext {
  const tenantContext = context ?? null;
  assertTenantContext(tenantContext);

  if (tenantContext.tenantId !== tenantId) {
    throw new Error("Tenant access denied.");
  }
}

export function createTenantScopedWhere<TWhere extends Record<string, unknown>>(
  tenantId: string,
  where?: TWhere,
): TWhere & { tenantId: string } {
  if (!tenantId) {
    throw new Error("Tenant-scoped queries require tenantId.");
  }

  return {
    ...(where ?? ({} as TWhere)),
    tenantId,
  };
}

export function assertTenantScopedQuery(
  model: TenantOwnedModel,
  where: Record<string, unknown> | null | undefined,
): asserts where is Record<string, unknown> & { tenantId: string } {
  if (!where || typeof where.tenantId !== "string" || where.tenantId.length === 0) {
    throw new Error(`${model} queries must include tenantId.`);
  }
}

export function assertTenantScopedInput<TInput extends { tenantId?: string }>(
  input: TInput,
  tenantId: string,
): asserts input is TInput & { tenantId: string } {
  if (!tenantId) {
    throw new Error("Tenant-scoped input requires tenantId.");
  }

  if (input.tenantId && input.tenantId !== tenantId) {
    throw new Error("Tenant-scoped input contains a mismatched tenantId.");
  }

  input.tenantId = tenantId;
}

export function assertTenantOwnedData(
  model: TenantOwnedModel,
  data: Record<string, unknown> | null | undefined,
): asserts data is Record<string, unknown> & { tenantId: string } {
  if (!data || typeof data.tenantId !== "string" || data.tenantId.length === 0) {
    throw new Error(`${model} writes must include tenantId.`);
  }
}

export function getTenantDisplayContext(context: TenantContext): {
  tenantId: string;
  actorUserId: string;
  membershipId: string;
  role: TenantRole;
  label: string;
} {
  return {
    tenantId: context.tenantId,
    actorUserId: context.userId,
    membershipId: context.membershipId,
    role: context.role,
    label: context.tenantName ?? "Selected clinic",
  };
}
