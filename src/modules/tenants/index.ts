export type TenantRole = "OWNER" | "ADMIN" | "CLINICIAN" | "STAFF";

export type TenantContext = {
  tenantId: string;
  userId: string;
  role: TenantRole;
  tenantName?: string;
};

export function assertTenantContext(
  context: TenantContext | null,
): asserts context is TenantContext {
  if (!context?.tenantId || !context.userId) {
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

export function getTenantDisplayContext(context: TenantContext): {
  tenantId: string;
  actorUserId: string;
  role: TenantRole;
  label: string;
} {
  return {
    tenantId: context.tenantId,
    actorUserId: context.userId,
    role: context.role,
    label: context.tenantName ?? "Selected clinic",
  };
}
