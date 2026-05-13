import {
  assertNoPIIInAuditMetadata,
  redactAuditMetadata,
  type AuditMetadataRecord,
} from "@/lib/privacy";
import {
  assertTenantScopedQuery,
  tenantOwnedModels,
  type TenantOwnedModel,
} from "@/modules/tenants";

export const enterpriseSecurityTargets = {
  applicationSecurity: "OWASP ASVS Level 2",
  accessibility: "WCAG 2.2 AA",
  performance: "Core Web Vitals",
} as const;

export const tenantIsolationReviewChecks = tenantOwnedModels.map(
  (model) => `${model} reads and writes must include tenantId.`,
);

export function reviewTenantScopedWhere(
  model: TenantOwnedModel,
  where: Record<string, unknown> | null | undefined,
) {
  assertTenantScopedQuery(model, where);
  return where;
}

export function reviewAuditMetadata(metadata: AuditMetadataRecord | undefined) {
  assertNoPIIInAuditMetadata(metadata);
  return redactAuditMetadata(metadata);
}
