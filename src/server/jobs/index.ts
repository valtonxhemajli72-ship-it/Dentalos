import {
  assertSafeJobMetadata,
  assertTenantJobContext,
  isKnownJobName,
  knownJobNames,
  requireJobIdempotencyKey,
  type SafeJobMetadata,
  type TenantJobContext,
} from "@/server/jobs/safety";

export { isKnownJobName, knownJobNames } from "@/server/jobs/safety";
export { getJobRegistryEntry, jobRegistry, jobRegistryEntries } from "@/server/jobs/registry";
export type { JobRegistryEntry, JobRetryPolicy } from "@/server/jobs/registry";
export type { SafeJobMetadata, TenantJobContext } from "@/server/jobs/safety";

export type JobName = (typeof knownJobNames)[number];
export type JobStatus = "QUEUED" | "DEFERRED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
export type JobPriority = "LOW" | "NORMAL" | "HIGH";
export type JobIdempotencyKey = string;
export type JobChannel = "SMS" | "EMAIL" | "WHATSAPP" | "MANUAL";

export type JobPayloadBase = TenantJobContext & {
  idempotencyKey: JobIdempotencyKey;
  metadata?: SafeJobMetadata;
};

export type PatientImportProcessPayload = JobPayloadBase & {
  importBatchId: string;
  source: "pasted_csv" | "upload_placeholder";
  rowCount?: number;
};

export type RecallCampaignPreparePayload = JobPayloadBase & {
  campaignId: string;
};

export type RecallCampaignAudienceValidationPayload = JobPayloadBase & {
  campaignId: string;
  candidateCount?: number;
};

export type NotificationPrepareBatchPayload = JobPayloadBase & {
  campaignId?: string;
  notificationBatchId?: string;
  channel?: JobChannel;
  audienceCount?: number;
};

export type NotificationDispatchPlaceholderPayload = JobPayloadBase & {
  notificationBatchId: string;
  channel?: JobChannel;
  dispatchMode: "placeholder";
};

export type ReportGeneratePlaceholderPayload = JobPayloadBase & {
  reportType: "recall_readiness" | "patient_import_summary" | "operational_snapshot";
  reportId?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
};

export type JobPayloadByName = {
  "patient_import.process": PatientImportProcessPayload;
  "recall_campaign.prepare": RecallCampaignPreparePayload;
  "recall_campaign.validate_audience": RecallCampaignAudienceValidationPayload;
  "notification.prepare_batch": NotificationPrepareBatchPayload;
  "notification.dispatch_placeholder": NotificationDispatchPlaceholderPayload;
  "report.generate_placeholder": ReportGeneratePlaceholderPayload;
};

export type AnyJobPayload = JobPayloadByName[JobName];
export type JobPayloadFor<TName extends JobName> = JobPayloadByName[TName];

export type QueueJobInput<TName extends JobName = JobName> = {
  name: TName;
  payload: JobPayloadFor<TName>;
  priority?: JobPriority;
  metadata?: SafeJobMetadata;
};

export type JobEnvelope<TName extends JobName = JobName> = {
  id: string;
  name: TName;
  status: JobStatus;
  priority: JobPriority;
  payload: JobPayloadFor<TName>;
  metadata?: SafeJobMetadata;
  queuedAt: Date;
};

export type JobResult<TName extends JobName = JobName> = {
  accepted: boolean;
  status: JobStatus;
  job?: JobEnvelope<TName>;
  reason?: string;
};

export type QueueClient = {
  enqueue<TName extends JobName>(job: QueueJobInput<TName>): Promise<JobResult<TName>>;
  enqueueMany?<TName extends JobName>(jobs: QueueJobInput<TName>[]): Promise<JobResult<TName>[]>;
};

export type JobHandler<TName extends JobName = JobName> = (
  job: JobEnvelope<TName>,
) => JobResult<TName> | Promise<JobResult<TName>>;

export type JobRegistry = Partial<{
  [TName in JobName]: JobHandler<TName>;
}>;

export function createNoopQueueClient(): QueueClient {
  const client: QueueClient = {
    async enqueue<TName extends JobName>(job: QueueJobInput<TName>): Promise<JobResult<TName>> {
      const envelope = createJobEnvelope(job, "DEFERRED");

      return {
        accepted: false,
        status: "DEFERRED",
        job: envelope,
        reason: "No queue runtime is configured.",
      };
    },
    async enqueueMany<TName extends JobName>(
      jobs: QueueJobInput<TName>[],
    ): Promise<JobResult<TName>[]> {
      return Promise.all(jobs.map((job) => client.enqueue(job)));
    },
  };

  return client;
}

export function createInlineDevelopmentQueueClient(
  registry: JobRegistry = {},
  options: { allowInlineExecution?: boolean } = {},
): QueueClient {
  const allowInlineExecution =
    options.allowInlineExecution ?? process.env.NODE_ENV !== "production";

  const client: QueueClient = {
    async enqueue<TName extends JobName>(job: QueueJobInput<TName>): Promise<JobResult<TName>> {
      const envelope = createJobEnvelope(job, "QUEUED");

      if (!allowInlineExecution) {
        return {
          accepted: false,
          status: "DEFERRED",
          job: { ...envelope, status: "DEFERRED" },
          reason: "Inline job execution is disabled.",
        };
      }

      const handler = registry[job.name] as JobHandler<TName> | undefined;

      if (!handler) {
        return {
          accepted: false,
          status: "DEFERRED",
          job: { ...envelope, status: "DEFERRED" },
          reason: "No inline development handler is registered.",
        };
      }

      try {
        return await handler({ ...envelope, status: "RUNNING" });
      } catch {
        return {
          accepted: true,
          status: "FAILED",
          job: { ...envelope, status: "FAILED" },
          reason: "handler_failed",
        };
      }
    },
    async enqueueMany<TName extends JobName>(
      jobs: QueueJobInput<TName>[],
    ): Promise<JobResult<TName>[]> {
      return Promise.all(jobs.map((job) => client.enqueue(job)));
    },
  };

  return client;
}

export const jobInterfaceRoadmapNote =
  "Job interfaces are dependency-free boundaries only. Durable async execution, workers, queues, retries, and real delivery providers are deferred.";

function createJobEnvelope<TName extends JobName>(
  input: QueueJobInput<TName>,
  status: JobStatus,
): JobEnvelope<TName> {
  if (!isKnownJobName(input.name)) {
    throw new Error("Unknown job name.");
  }

  assertTenantJobContext(input.payload);
  requireJobIdempotencyKey(input.payload);
  assertSafeJobMetadata(input.payload.metadata);
  assertSafeJobMetadata(input.metadata);

  return {
    id: `${input.name}:${input.payload.tenantId}:${input.payload.idempotencyKey}`,
    name: input.name,
    status,
    priority: input.priority ?? "NORMAL",
    payload: input.payload,
    metadata: input.metadata,
    queuedAt: new Date(),
  };
}
