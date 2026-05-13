export type TenantContext = {
  tenantId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "CLINICIAN" | "STAFF";
};

export function assertTenantContext(
  context: TenantContext | null,
): asserts context is TenantContext {
  if (!context?.tenantId || !context.userId) {
    throw new Error("Tenant context is required.");
  }
}
