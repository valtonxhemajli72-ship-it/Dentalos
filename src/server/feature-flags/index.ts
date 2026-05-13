import type { TenantRole } from "@/modules/tenants";

export type FeatureFlagKey =
  | "patient_import_persistence"
  | "recall_database_candidates"
  | "campaign_drafts"
  | "notification_delivery"
  | "ai_assistant"
  | "usage_metering"
  | "enterprise_isolation_tiers";

export type FeatureFlagContext = {
  tenantId: string;
  userRole?: TenantRole;
  region?: "EU" | "US" | "AU" | "LOCAL";
};

export interface FeatureFlagClient {
  isEnabled(key: FeatureFlagKey, context: FeatureFlagContext): Promise<boolean>;
}

export function createStaticFeatureFlagClient(
  flags: Partial<Record<FeatureFlagKey, boolean>> = {},
): FeatureFlagClient {
  return {
    async isEnabled(key, context) {
      if (!context.tenantId) {
        return false;
      }

      return flags[key] ?? false;
    },
  };
}

export const featureFlagRoadmapNote =
  "Unleash may implement FeatureFlagClient later; feature flags are release controls, not authorization.";
