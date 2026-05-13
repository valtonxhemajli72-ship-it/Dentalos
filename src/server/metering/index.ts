import { assertNoPIIInAuditMetadata } from "@/lib/privacy";

export type UsageEventName =
  | "patient_import.saved"
  | "recall_candidates.viewed"
  | "campaign_draft.prepared"
  | "notification_draft.created";

export type UsageEventMetadataValue = string | number | boolean | null | undefined;

export type UsageEvent = {
  name: UsageEventName;
  tenantId: string;
  actorUserId?: string;
  quantity: number;
  occurredAt: Date;
  metadata?: Record<string, UsageEventMetadataValue>;
};

export interface UsageMeter {
  recordUsage(event: UsageEvent): Promise<void>;
}

export function createUsageEvent(input: Omit<UsageEvent, "occurredAt">): UsageEvent {
  if (!input.tenantId) {
    throw new Error("Usage events require tenantId.");
  }

  assertNoPIIInAuditMetadata(input.metadata);

  return {
    ...input,
    occurredAt: new Date(),
  };
}

export function createNoopUsageMeter(): UsageMeter {
  return {
    async recordUsage() {
      return undefined;
    },
  };
}

export const meteringRoadmapNote =
  "OpenMeter may implement UsageMeter later; no billing or payment integration exists yet.";
