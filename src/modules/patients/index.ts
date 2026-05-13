export type PatientLifecycleStatus = "active" | "due_for_recall" | "overdue" | "inactive";

export type PatientSummary = {
  id: string;
  tenantId: string;
  displayName: string;
  status: PatientLifecycleStatus;
  nextRecallDueAt?: Date;
};

export type {
  RecallAction,
  RecallContactChannel,
  RecallPatient,
  RecallQueueItem,
  RecallStatus,
  RecallWorkspaceSnapshot,
  RecallWorkspaceSummary,
} from "@/modules/patients/recall";
