import { requireTenantId, type TenantContext } from "@/modules/tenants";

export type AuditAction =
  | "patient_import.previewed"
  | "patient_import.validated"
  | "patient_import.imported"
  | "recall_campaign.prepared";

export type AuditMetadata = Record<string, number | string | boolean | null | undefined>;

export type AuditEvent = {
  tenantId: string;
  actorUserId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: AuditMetadata;
  createdAt: Date;
};

const unsafeMetadataKeyPattern = /(name|email|phone|note|message|body|raw|csv|contactValue)/i;

export function createAuditEvent(input: {
  tenant: TenantContext;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: AuditMetadata;
}): AuditEvent {
  assertSafeAuditMetadata(input.metadata);

  return {
    tenantId: requireTenantId(input.tenant),
    actorUserId: input.tenant.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: new Date(),
  };
}

export function createPatientImportPreviewedAuditEvent(
  tenant: TenantContext,
  metadata: { rowCount: number; validRowCount: number; invalidRowCount: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "patient_import.previewed",
    entityType: "PatientImportBatch",
    metadata,
  });
}

export function createPatientImportValidatedAuditEvent(
  tenant: TenantContext,
  batchId: string,
  metadata: { rowCount: number; validRowCount: number; invalidRowCount: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "patient_import.validated",
    entityType: "PatientImportBatch",
    entityId: batchId,
    metadata,
  });
}

export function createPatientImportImportedAuditEvent(
  tenant: TenantContext,
  batchId: string,
  metadata: { importedCount: number; skippedCount: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "patient_import.imported",
    entityType: "PatientImportBatch",
    entityId: batchId,
    metadata,
  });
}

export function createRecallCampaignPreparedAuditEvent(
  tenant: TenantContext,
  campaignId: string,
  metadata: { candidateCount: number; readyToContact: number; reviewRequired: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.prepared",
    entityType: "RecallCampaign",
    entityId: campaignId,
    metadata,
  });
}

function assertSafeAuditMetadata(metadata: AuditMetadata | undefined) {
  Object.keys(metadata ?? {}).forEach((key) => {
    if (unsafeMetadataKeyPattern.test(key)) {
      throw new Error(`Audit metadata key is not allowed: ${key}`);
    }
  });
}
