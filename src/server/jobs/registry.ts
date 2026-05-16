import type { JobName } from "@/server/jobs";

export type JobRetryPolicy = {
  maxAttempts: number;
  backoff: "none" | "fixed" | "exponential";
  deadLetter: "planned" | "disabled";
};

export type JobRegistryEntry = {
  name: JobName;
  description: string;
  tenantOwned: boolean;
  idempotencyRequired: boolean;
  payloadNotes: string[];
  retryPolicy: JobRetryPolicy;
  futureWorkerMapping: string;
};

const retryLater: JobRetryPolicy = {
  maxAttempts: 3,
  backoff: "exponential",
  deadLetter: "planned",
};

export const jobRegistryEntries = [
  {
    name: "patient_import.process",
    description: "Future background processing boundary for persisted patient import batches.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "importBatchId", "rowCount", "idempotencyKey"],
    retryPolicy: retryLater,
    futureWorkerMapping: "patient-import worker handler after import processing leaves requests",
  },
  {
    name: "recall_campaign.prepare",
    description: "Future no-send campaign preparation boundary after campaign approval.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "campaignId", "idempotencyKey"],
    retryPolicy: retryLater,
    futureWorkerMapping: "recall campaign preparation worker before notification adapter handoff",
  },
  {
    name: "recall_campaign.validate_audience",
    description:
      "Future background validation boundary for larger tenant-scoped campaign audiences.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "campaignId", "candidateCount", "idempotencyKey"],
    retryPolicy: retryLater,
    futureWorkerMapping: "recall audience validation worker with tenant-scoped repository reads",
  },
  {
    name: "notification.prepare_batch",
    description:
      "Future notification preparation boundary that creates delivery-ready records only.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "campaignId", "notificationBatchId", "channel"],
    retryPolicy: retryLater,
    futureWorkerMapping: "notification preparation worker before provider-specific dispatch exists",
  },
  {
    name: "notification.dispatch_placeholder",
    description:
      "Placeholder boundary for future reviewed delivery dispatch without provider calls today.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "notificationBatchId", "channel", "dispatchMode"],
    retryPolicy: {
      maxAttempts: 0,
      backoff: "none",
      deadLetter: "disabled",
    },
    futureWorkerMapping:
      "real dispatch requires a separate reviewed provider adapter and no-PII logs",
  },
  {
    name: "report.generate_placeholder",
    description: "Future background report generation boundary for operational tenant reports.",
    tenantOwned: true,
    idempotencyRequired: true,
    payloadNotes: ["tenantId", "actorUserId", "reportType", "reportId", "idempotencyKey"],
    retryPolicy: retryLater,
    futureWorkerMapping: "report worker after export and retention policy are defined",
  },
] as const satisfies readonly JobRegistryEntry[];

export const jobRegistry = Object.freeze(
  Object.fromEntries(jobRegistryEntries.map((entry) => [entry.name, entry])),
) as unknown as Readonly<Record<JobName, JobRegistryEntry>>;

export function getJobRegistryEntry(name: JobName): JobRegistryEntry {
  return jobRegistry[name];
}
