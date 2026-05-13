export type DatabaseRequestContext = {
  tenantId: string;
  actorUserId?: string;
};

export const databaseAccessRules = [
  "Resolve tenant context before tenant-owned queries.",
  "Filter tenant-owned records by tenantId.",
  "Keep PII out of logs and audit metadata.",
] as const;
