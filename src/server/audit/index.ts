import {
  assertNoPIIInAuditMetadata,
  type AuditMetadataRecord,
  type AuditMetadataValue,
} from "@/lib/privacy";
import { requireTenantId, type TenantContext } from "@/modules/tenants";

export type AuditAction =
  | "auth.login.succeeded"
  | "auth.login.failed"
  | "auth.logout"
  | "auth.sign_in.succeeded"
  | "auth.sign_in.failed"
  | "auth.sign_out"
  | "auth.session.resolved"
  | "rbac.permission_denied"
  | "tenant.context.resolved"
  | "tenant.context_failed"
  | "tenant.membership.resolved"
  | "tenant.membership_missing"
  | "patient_import.previewed"
  | "patient_import.validated"
  | "patient_import.imported"
  | "patient_import.failed"
  | "recall_candidates.viewed"
  | "recall_campaign.prepared";

export type AuditMetadata = Record<string, AuditMetadataValue>;

export type AuditEvent = {
  tenantId: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: AuditMetadata;
  createdAt: Date;
};

export type AuditLogDatabase = {
  auditLog: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

export function sanitizeAuditMetadata(metadata: AuditMetadata | undefined): AuditMetadata {
  const sanitized = Object.entries(metadata ?? {}).reduce<AuditMetadata>(
    (current, [key, value]) => {
      if (value === undefined) {
        return current;
      }

      current[key] = value;
      return current;
    },
    {},
  );

  assertNoPIIInAuditMetadata(sanitized as AuditMetadataRecord);
  return sanitized;
}

export function createAuditEvent(input: {
  tenant: TenantContext;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: AuditMetadata;
}): AuditEvent {
  return {
    tenantId: requireTenantId(input.tenant),
    actorUserId: input.tenant.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: sanitizeAuditMetadata(input.metadata),
    createdAt: new Date(),
  };
}

export async function writeAuditEvent(db: AuditLogDatabase, event: AuditEvent): Promise<void> {
  await db.auditLog.create({
    data: {
      tenantId: event.tenantId,
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata ?? {},
      createdAt: event.createdAt,
    },
  });
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

export function createAuthLoginSucceededAuditEvent(
  tenant: TenantContext,
  metadata: { mode: "demo" | "provider" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.login.succeeded",
    entityType: "User",
    entityId: tenant.userId,
    metadata,
  });
}

export function createAuthSignInSucceededAuditEvent(
  tenant: TenantContext,
  metadata: { provider: "google" | "unknown" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.sign_in.succeeded",
    entityType: "User",
    entityId: tenant.userId,
    metadata,
  });
}

export function createAuthSignInFailedAuditEvent(
  tenant: TenantContext,
  metadata: { reason: "missing_email" | "provider_error" | "unverified_email" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.sign_in.failed",
    entityType: "User",
    metadata,
  });
}

export function createAuthSignOutAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.sign_out",
    entityType: "User",
    entityId: tenant.userId,
  });
}

export function createAuthSessionResolvedAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.session.resolved",
    entityType: "User",
    entityId: tenant.userId,
  });
}

export function createTenantMembershipResolvedAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.membership.resolved",
    entityType: "Membership",
    entityId: tenant.membershipId,
    metadata: { role: tenant.role },
  });
}

export function createTenantMembershipMissingAuditEvent(
  tenant: TenantContext,
  metadata: { reason: "user_not_found" | "membership_not_found" | "database_unavailable" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.membership_missing",
    entityType: "Membership",
    metadata,
  });
}

export function createAuthLoginFailedAuditEvent(
  tenant: TenantContext,
  metadata: { reason: "missing_session" | "provider_error" | "tenant_missing" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.login.failed",
    entityType: "User",
    metadata,
  });
}

export function createAuthLogoutAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "auth.logout",
    entityType: "User",
    entityId: tenant.userId,
  });
}

export function createPermissionDeniedAuditEvent(
  tenant: TenantContext,
  metadata: { permission: string; role: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "rbac.permission_denied",
    entityType: "Membership",
    entityId: tenant.membershipId,
    metadata,
  });
}

export function createTenantContextResolvedAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.context.resolved",
    entityType: "Tenant",
    entityId: tenant.tenantId,
    metadata: { role: tenant.role },
  });
}

export function createTenantContextFailedAuditEvent(
  tenant: TenantContext,
  metadata: { reason: "missing_membership" | "missing_tenant" | "permission_denied" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.context_failed",
    entityType: "Tenant",
    entityId: tenant.tenantId,
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
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    createdPatients: number;
    skippedRows: number;
  },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "patient_import.imported",
    entityType: "PatientImportBatch",
    entityId: batchId,
    metadata,
  });
}

export function createPatientImportFailedAuditEvent(
  tenant: TenantContext,
  metadata: { totalRows: number; validRows: number; invalidRows: number; duplicateRows: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "patient_import.failed",
    entityType: "PatientImportBatch",
    metadata,
  });
}

export function createRecallCandidatesViewedAuditEvent(
  tenant: TenantContext,
  metadata: { candidateCount: number; source: "database" | "demo" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_candidates.viewed",
    entityType: "Patient",
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
