import {
  assertNoPIIInAuditMetadata,
  isLikelyEmail,
  isLikelyPhone,
  redactPII,
  type AuditMetadataRecord,
  type AuditMetadataValue,
} from "@/lib/privacy";

export const knownJobNames = [
  "patient_import.process",
  "recall_campaign.prepare",
  "recall_campaign.validate_audience",
  "notification.prepare_batch",
  "notification.dispatch_placeholder",
  "report.generate_placeholder",
] as const;

export type KnownJobName = (typeof knownJobNames)[number];
export type SafeJobMetadata = AuditMetadataRecord;

export type TenantJobContext = {
  tenantId: string;
  actorUserId?: string;
  requestId?: string;
  correlationId?: string;
};

const forbiddenJobMetadataKeyPattern =
  /(firstName|lastName|fullName|name|email|phone|note|message|messageBody|body|raw|rawCsv|csv|contactValue|address|dob|birth|password|token|invitationToken|tokenHash|secret|session|cookie|authorization|oauth|credential|providerPayload|requestBody)/i;

const safeLogKeyPattern =
  /^(id|jobId|name|tenantId|actorUserId|requestId|correlationId|idempotencyKey|campaignId|patientId|importBatchId|notificationBatchId|reportId|reportType|source|status|channel|dispatchMode|priority|attempt|attempts|maxAttempts|rowCount|validRowCount|invalidRowCount|duplicateRows|createdPatients|skippedRows|audienceCount|candidateCount|selectedCount|metadata)$/i;

export function assertTenantJobContext(
  context: Partial<TenantJobContext> | null | undefined,
): asserts context is TenantJobContext {
  if (!context || typeof context.tenantId !== "string" || context.tenantId.trim().length === 0) {
    throw new Error("Tenant job context requires tenantId.");
  }
}

export function assertSafeJobMetadata(metadata: SafeJobMetadata | undefined): void {
  if (!metadata) {
    return;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (forbiddenJobMetadataKeyPattern.test(key)) {
      throw new Error(`Job metadata key is not allowed: ${key}`);
    }

    assertSafeMetadataValue(key, value);
  }

  assertNoPIIInAuditMetadata(metadata);
}

export function createIdempotencyKey(
  parts: Array<string | number | boolean | null | undefined>,
): string {
  const normalizedParts = parts
    .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
    .filter(Boolean);

  if (normalizedParts.length === 0) {
    throw new Error("Idempotency key requires at least one stable part.");
  }

  for (const part of normalizedParts) {
    if (isLikelyEmail(part) || isLikelyPhone(part)) {
      throw new Error("Idempotency key parts must not include PII.");
    }
  }

  return normalizedParts
    .map((part) => part.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 96))
    .join(":");
}

export function redactJobPayloadForLogs(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, redactJobLogValue(key, value)]),
  );
}

export function isKnownJobName(value: unknown): value is KnownJobName {
  return typeof value === "string" && knownJobNames.includes(value as KnownJobName);
}

export function requireJobIdempotencyKey(payload: { idempotencyKey?: string | null }): string {
  if (typeof payload.idempotencyKey !== "string" || payload.idempotencyKey.trim().length === 0) {
    throw new Error("Job payload requires idempotencyKey.");
  }

  if (isLikelyEmail(payload.idempotencyKey) || isLikelyPhone(payload.idempotencyKey)) {
    throw new Error("Job idempotencyKey must not include PII.");
  }

  return payload.idempotencyKey;
}

function assertSafeMetadataValue(key: string, value: AuditMetadataValue): void {
  if (
    value !== null &&
    value !== undefined &&
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    throw new Error(`Job metadata value must be scalar: ${key}`);
  }

  if (typeof value === "string" && (isLikelyEmail(value) || isLikelyPhone(value))) {
    throw new Error(`Job metadata value appears to contain PII: ${key}`);
  }
}

function redactJobLogValue(key: string, value: unknown): unknown {
  if (key === "name" && isKnownJobName(value)) {
    return value;
  }

  if (!safeLogKeyPattern.test(key) || forbiddenJobMetadataKeyPattern.test(key)) {
    return "[redacted]";
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return isLikelyEmail(value) || isLikelyPhone(value) ? redactPII(value) : value;
  }

  if (key === "metadata" && typeof value === "object" && !Array.isArray(value)) {
    try {
      assertSafeJobMetadata(value as SafeJobMetadata);
      return value;
    } catch {
      return "[redacted]";
    }
  }

  return "[redacted]";
}
