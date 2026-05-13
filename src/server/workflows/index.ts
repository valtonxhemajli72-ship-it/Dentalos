import { assertNoPIIInAuditMetadata, type AuditMetadataRecord } from "@/lib/privacy";

export type WorkflowName =
  | "tenant.onboarding"
  | "tenant.offboarding"
  | "patient_import.persist"
  | "recall_campaign.prepare"
  | "recall_campaign.run"
  | "integration.sync";

export type WorkflowPayloadValue = string | number | boolean | null | undefined;
export type WorkflowPayload = Record<string, WorkflowPayloadValue>;

export type WorkflowStartInput<TPayload extends WorkflowPayload = Record<string, never>> = {
  name: WorkflowName;
  tenantId: string;
  workflowId?: string;
  actorUserId?: string;
  payload?: TPayload;
  idempotencyKey?: string;
};

export type WorkflowStartResult = {
  workflowId: string;
  accepted: boolean;
  provider: "noop" | "temporal";
};

export interface WorkflowClient {
  startWorkflow(input: WorkflowStartInput): Promise<WorkflowStartResult>;
}

export function createNoopWorkflowClient(): WorkflowClient {
  return {
    async startWorkflow(input) {
      if (!input.tenantId) {
        throw new Error("Workflow start requires tenantId.");
      }

      assertNoPIIInAuditMetadata(input.payload as AuditMetadataRecord | undefined);

      return {
        workflowId: input.workflowId ?? input.idempotencyKey ?? `${input.tenantId}:${input.name}`,
        accepted: false,
        provider: "noop",
      };
    },
  };
}

export const workflowRoadmapNote =
  "Temporal may implement WorkflowClient later for durable tenant onboarding, offboarding, recall, and integration workflows.";
