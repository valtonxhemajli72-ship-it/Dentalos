import { isLikelyEmail, isLikelyPhone } from "@/lib/privacy";

export type SafeMetricValue = string | number | boolean | undefined;
export type SafeMetricLabels = Record<string, SafeMetricValue>;
export type safeMetricLabels = SafeMetricLabels;

export type MetricName =
  | "patient_import_rows_total"
  | "patient_import_saved_total"
  | "recall_candidates_total"
  | "workflow_started_total"
  | "job_failed_total"
  | "request_latency_ms";

const unsafeMetricLabelKeyPattern =
  /(name|email|phone|note|message|body|address|dob|birth|patient|raw|csv)/i;

export function assertSafeMetricLabels(labels: SafeMetricLabels): void {
  Object.entries(labels).forEach(([key, value]) => {
    if (unsafeMetricLabelKeyPattern.test(key)) {
      throw new Error(`Metric label key is not safe: ${key}`);
    }

    if (typeof value === "string" && (isLikelyEmail(value) || isLikelyPhone(value))) {
      throw new Error(`Metric label value appears to contain PII: ${key}`);
    }
  });
}

export function recordMetric(name: MetricName, value: number, labels: SafeMetricLabels = {}): void {
  assertSafeMetricLabels(labels);
  void name;
  void value;
}

export function recordTenantMetric(
  tenantId: string,
  name: MetricName,
  value: number,
  labels: SafeMetricLabels = {},
): void {
  if (!tenantId) {
    throw new Error("Tenant metrics require tenantId.");
  }

  recordMetric(name, value, {
    ...labels,
    tenantId,
  });
}

export const observabilityRoadmapNote =
  "Prometheus, Grafana, and OpenTelemetry may implement metric recording later; metric labels must never contain PII.";
