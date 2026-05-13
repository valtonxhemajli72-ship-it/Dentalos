export type JobName = "send.reminder" | "start.recall.campaign" | "sync.integration";

export type JobEnvelope = {
  name: JobName;
  tenantId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export function enqueueJob(job: JobEnvelope): JobEnvelope {
  return job;
}
