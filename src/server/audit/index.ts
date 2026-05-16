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
  | "tenant.bootstrap_started"
  | "tenant.bootstrap_completed"
  | "tenant.bootstrap_failed"
  | "tenant.membership.resolved"
  | "tenant.membership_missing"
  | "tenant.switched"
  | "tenant.switch_failed"
  | "invitation.created"
  | "invitation.revoked"
  | "invitation.accept_attempted"
  | "invitation.accepted"
  | "invitation.accept_failed"
  | "invitation.accept_expired"
  | "invitation.accept_revoked"
  | "invitation.accept_email_mismatch"
  | "invitation.expired"
  | "membership.created_from_invitation"
  | "membership.owner_bootstrapped"
  | "membership.role_updated"
  | "membership.deactivated"
  | "membership.last_owner_protection_triggered"
  | "patient_import.previewed"
  | "patient_import.validated"
  | "patient_import.imported"
  | "patient_import.failed"
  | "recall_candidates.viewed"
  | "recall_campaign.prepared"
  | "recall_campaign.draft_created"
  | "recall_campaign.previewed"
  | "recall_campaign.audience_validated"
  | "recall_campaign.patient_selected"
  | "recall_campaign.create_failed";

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
  return createAuditEventForTenant({
    tenantId: requireTenantId(input.tenant),
    actorUserId: input.tenant.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

export function createAuditEventForTenant(input: {
  tenantId: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: AuditMetadata;
}): AuditEvent {
  if (!input.tenantId) {
    throw new Error("Audit events require tenantId.");
  }

  return {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: sanitizeAuditMetadata(input.metadata),
    createdAt: new Date(),
  };
}

export async function writeAuditEvent(db: AuditLogDatabase, event: AuditEvent): Promise<void> {
  const metadata = sanitizeAuditMetadata(event.metadata);

  await db.auditLog.create({
    data: {
      tenantId: event.tenantId,
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata,
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

export function createTenantSwitchedAuditEvent(
  tenant: TenantContext,
  metadata: { fromTenantSelected: boolean },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.switched",
    entityType: "Tenant",
    entityId: tenant.tenantId,
    metadata,
  });
}

export function createTenantSwitchFailedAuditEvent(
  tenant: TenantContext,
  metadata: { reason: "membership_missing" | "invalid_selection" },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "tenant.switch_failed",
    entityType: "Tenant",
    entityId: tenant.tenantId,
    metadata,
  });
}

export function createInvitationCreatedAuditEvent(
  tenant: TenantContext,
  invitationId: string,
  metadata: { role: string; status: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "invitation.created",
    entityType: "TenantInvitation",
    entityId: invitationId,
    metadata,
  });
}

export function createInvitationRevokedAuditEvent(
  tenant: TenantContext,
  invitationId: string,
  metadata: { status: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "invitation.revoked",
    entityType: "TenantInvitation",
    entityId: invitationId,
    metadata,
  });
}

export function createInvitationAcceptAttemptedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  invitationId: string;
  metadata: { status: string; role?: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invitation.accept_attempted",
    entityType: "TenantInvitation",
    entityId: input.invitationId,
    metadata: input.metadata,
  });
}

export function createInvitationAcceptedAuditEvent(
  tenantOrInput:
    | TenantContext
    | {
        tenantId: string;
        actorUserId?: string;
        invitationId: string;
        metadata: {
          role: string;
          status: string;
          membershipCreated?: boolean;
          membershipReactivated?: boolean;
        };
      },
  invitationId?: string,
  metadata?: { role: string; status: string },
): AuditEvent {
  if ("invitationId" in tenantOrInput) {
    return createAuditEventForTenant({
      tenantId: tenantOrInput.tenantId,
      actorUserId: tenantOrInput.actorUserId,
      action: "invitation.accepted",
      entityType: "TenantInvitation",
      entityId: tenantOrInput.invitationId,
      metadata: tenantOrInput.metadata,
    });
  }

  return createAuditEvent({
    tenant: tenantOrInput,
    action: "invitation.accepted",
    entityType: "TenantInvitation",
    entityId: invitationId,
    metadata,
  });
}

export function createInvitationAcceptFailedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  invitationId: string;
  metadata: { reason: string; status: string; role?: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invitation.accept_failed",
    entityType: "TenantInvitation",
    entityId: input.invitationId,
    metadata: input.metadata,
  });
}

export function createInvitationAcceptExpiredAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  invitationId: string;
  metadata: { status: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invitation.accept_expired",
    entityType: "TenantInvitation",
    entityId: input.invitationId,
    metadata: input.metadata,
  });
}

export function createInvitationAcceptRevokedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  invitationId: string;
  metadata: { status: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invitation.accept_revoked",
    entityType: "TenantInvitation",
    entityId: input.invitationId,
    metadata: input.metadata,
  });
}

export function createInvitationAcceptEmailMismatchAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  invitationId: string;
  metadata: { status: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invitation.accept_email_mismatch",
    entityType: "TenantInvitation",
    entityId: input.invitationId,
    metadata: input.metadata,
  });
}

export function createInvitationExpiredAuditEvent(
  tenant: TenantContext,
  metadata: { expiredCount: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "invitation.expired",
    entityType: "TenantInvitation",
    metadata,
  });
}

export function createMembershipCreatedFromInvitationAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  membershipId: string;
  invitationId: string;
  metadata: { role: string; reactivated?: boolean };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "membership.created_from_invitation",
    entityType: "Membership",
    entityId: input.membershipId,
    metadata: {
      ...input.metadata,
      invitationId: input.invitationId,
    },
  });
}

export function createMembershipRoleUpdatedAuditEvent(
  tenant: TenantContext,
  membershipId: string,
  metadata: { previousRole: string; nextRole: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "membership.role_updated",
    entityType: "Membership",
    entityId: membershipId,
    metadata,
  });
}

export function createMembershipDeactivatedAuditEvent(
  tenant: TenantContext,
  membershipId: string,
  metadata: { previousRole: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "membership.deactivated",
    entityType: "Membership",
    entityId: membershipId,
    metadata,
  });
}

export function createLastOwnerProtectionAuditEvent(tenant: TenantContext): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "membership.last_owner_protection_triggered",
    entityType: "Membership",
    metadata: { protected: true },
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

export function createTenantBootstrapStartedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  metadata: {
    tenantId: string;
    userId: string;
    status: "started";
    tenantCreated: boolean;
    userCreated: boolean;
  };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "tenant.bootstrap_started",
    entityType: "Tenant",
    entityId: input.tenantId,
    metadata: input.metadata,
  });
}

export function createTenantBootstrapCompletedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  membershipId: string;
  metadata: {
    tenantId: string;
    userId: string;
    membershipId: string;
    status: "completed";
    tenantCreated: boolean;
    userCreated: boolean;
    membershipCreated: boolean;
    membershipReactivated: boolean;
    setupStateChanged: boolean;
  };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "tenant.bootstrap_completed",
    entityType: "Tenant",
    entityId: input.tenantId,
    metadata: input.metadata,
  });
}

export function createTenantBootstrapFailedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  metadata: { tenantId: string; status: "failed"; reason: string };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "tenant.bootstrap_failed",
    entityType: "Tenant",
    entityId: input.tenantId,
    metadata: input.metadata,
  });
}

export function createMembershipOwnerBootstrappedAuditEvent(input: {
  tenantId: string;
  actorUserId?: string;
  membershipId: string;
  metadata: {
    tenantId: string;
    userId: string;
    membershipId: string;
    status: "active";
    membershipCreated: boolean;
    membershipReactivated: boolean;
  };
}): AuditEvent {
  return createAuditEventForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "membership.owner_bootstrapped",
    entityType: "Membership",
    entityId: input.membershipId,
    metadata: input.metadata,
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

export function createRecallCampaignDraftCreatedAuditEvent(
  tenant: TenantContext,
  campaignId: string,
  metadata: { audienceCount: number; status: string; channel: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.draft_created",
    entityType: "RecallCampaign",
    entityId: campaignId,
    metadata,
  });
}

export function createRecallCampaignPreviewedAuditEvent(
  tenant: TenantContext,
  metadata: { audienceCount: number; channel: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.previewed",
    entityType: "RecallCampaign",
    metadata,
  });
}

export function createRecallCampaignAudienceValidatedAuditEvent(
  tenant: TenantContext,
  metadata: { audienceCount: number; channel: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.audience_validated",
    entityType: "RecallCampaign",
    metadata,
  });
}

export function createRecallCampaignPatientSelectedAuditEvent(
  tenant: TenantContext,
  campaignId: string,
  metadata: { selectedCount: number },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.patient_selected",
    entityType: "RecallCampaign",
    entityId: campaignId,
    metadata,
  });
}

export function createRecallCampaignCreateFailedAuditEvent(
  tenant: TenantContext,
  metadata: { reason: string; status: string },
): AuditEvent {
  return createAuditEvent({
    tenant,
    action: "recall_campaign.create_failed",
    entityType: "RecallCampaign",
    metadata,
  });
}
