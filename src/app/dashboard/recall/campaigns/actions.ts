"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CampaignAudienceValidationError,
  CampaignMessageValidationError,
  CampaignStatusTransitionError,
  isRecallCampaignChannel,
  normalizeCampaignMessageTemplate,
  normalizeCampaignName,
  normalizeSelectedPatientIds,
  prepareCampaignPreview,
  type RecallCampaignChannel,
  type RecallCampaignDetail,
} from "@/modules/recall";
import {
  approveRecallCampaignForTenant,
  cancelRecallCampaignForTenant,
  createRecallCampaignDraftForTenant,
  submitRecallCampaignForTenantReview,
  updateRecallCampaignDraftForTenant,
  validateCampaignAudienceForTenant,
  type RecallCampaignRepositoryDatabase,
} from "@/modules/recall/repository";
import { describeAuthBoundaryError, isAuthBoundaryError, requirePermission } from "@/server/auth";
import {
  createRecallCampaignApprovalFailedAuditEvent,
  createRecallCampaignApprovedAuditEvent,
  createRecallCampaignAudienceValidatedAuditEvent,
  createRecallCampaignCancelledAuditEvent,
  createRecallCampaignCreateFailedAuditEvent,
  createRecallCampaignDraftCreatedAuditEvent,
  createRecallCampaignDraftUpdatedAuditEvent,
  createRecallCampaignMessageUpdatedAuditEvent,
  createRecallCampaignPatientSelectedAuditEvent,
  createRecallCampaignPreviewedAuditEvent,
  createRecallCampaignSubmittedForReviewAuditEvent,
  writeAuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";

export type RecallCampaignActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    campaignId?: string;
    name?: string;
    channel?: string;
    patientIds?: string;
    template?: string;
  };
  preview?: {
    channelLabel: string;
    body: string;
    audienceCount: number;
  };
};

export const initialRecallCampaignActionState: RecallCampaignActionState = {
  status: "idle",
  message: "",
};

export async function createRecallCampaignDraftAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;
  let redirectTo = "/dashboard/recall";

  try {
    tenant = await requirePermission("campaign:prepare");

    const input = parseCampaignForm(formData);
    if (input.fieldErrors) {
      return {
        status: "error",
        message: "Review the campaign draft fields.",
        fieldErrors: input.fieldErrors,
      };
    }

    const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase & AuditLogDatabase;
    const campaign = await createRecallCampaignDraftForTenant(
      tenant.tenantId,
      {
        name: input.name,
        channel: input.channel,
        selectedPatientIds: input.selectedPatientIds,
        actorUserId: tenant.userId,
      },
      { db },
    );

    await writeCampaignCreatedAuditEvents(tenant, db, campaign.id, {
      audienceCount: campaign.audienceCount,
      channel: campaign.channel,
      status: campaign.status,
    });

    redirectTo = `/dashboard/recall/campaigns/${campaign.id}?created=1`;
  } catch (error) {
    await writeCreateFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  revalidateCampaignPaths(redirectTo);
  redirect(redirectTo);
}

export async function previewRecallCampaignAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;

  try {
    tenant = await requirePermission("campaign:prepare");

    const input = parseCampaignForm(formData);
    if (input.fieldErrors?.channel) {
      return {
        status: "error",
        message: "Choose a valid campaign channel.",
        fieldErrors: { channel: input.fieldErrors.channel },
      };
    }

    const selectedPatientIds = input.selectedPatientIds ?? [];
    const preview = prepareCampaignPreview({
      channel: input.channel ?? "MANUAL",
      audienceCount: selectedPatientIds.length,
    });

    if (selectedPatientIds.length > 0) {
      const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase &
        AuditLogDatabase;
      const audience = await validateCampaignAudienceForTenant(
        tenant.tenantId,
        selectedPatientIds,
        { db },
      );
      await writeAuditEvent(
        db,
        createRecallCampaignPreviewedAuditEvent(tenant, {
          audienceCount: audience.length,
          channel: preview.channel,
        }),
      );
    }

    return {
      status: "success",
      message: "Preview prepared. No messages were sent.",
      preview: {
        channelLabel: preview.channelLabel,
        body: preview.preview,
        audienceCount: selectedPatientIds.length,
      },
    };
  } catch (error) {
    await writeCreateFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }
}

export async function updateRecallCampaignDraftAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;
  let redirectTo = "/dashboard/recall";

  try {
    tenant = await requirePermission("campaign:prepare");

    const input = parseCampaignUpdateForm(formData);
    if (input.fieldErrors) {
      return {
        status: "error",
        message: "Review the campaign draft fields.",
        fieldErrors: input.fieldErrors,
      };
    }

    const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase & AuditLogDatabase;
    const campaign = await updateRecallCampaignDraftForTenant(
      tenant.tenantId,
      {
        campaignId: input.campaignId,
        name: input.name,
        channel: input.channel,
        messageTemplate: input.template,
        actorUserId: tenant.userId,
      },
      { db },
    );

    await writeDraftUpdatedAuditEvents(tenant, db, campaign);
    redirectTo = `/dashboard/recall/campaigns/${campaign.id}?updated=1`;
  } catch (error) {
    await writeCreateFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  revalidateCampaignPaths(redirectTo);
  redirect(redirectTo);
}

export async function submitRecallCampaignForReviewAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;
  let redirectTo = "/dashboard/recall";

  try {
    tenant = await requirePermission("campaign:prepare");
    const campaignId = parseCampaignId(formData);
    const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase & AuditLogDatabase;
    const campaign = await submitRecallCampaignForTenantReview(
      tenant.tenantId,
      campaignId,
      tenant.userId,
      { db },
    );

    await writeAuditEvent(
      db,
      createRecallCampaignSubmittedForReviewAuditEvent(tenant, campaign.id, {
        audienceCount: campaign.audienceCount,
        channel: campaign.channel,
        status: campaign.status,
      }),
    );

    redirectTo = `/dashboard/recall/campaigns/${campaign.id}?review=1`;
  } catch (error) {
    await writeApprovalFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  revalidateCampaignPaths(redirectTo);
  redirect(redirectTo);
}

export async function approveRecallCampaignAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;
  let redirectTo = "/dashboard/recall";

  try {
    tenant = await requirePermission("campaign:approve");
    const campaignId = parseCampaignId(formData);
    const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase & AuditLogDatabase;
    const campaign = await approveRecallCampaignForTenant(
      tenant.tenantId,
      campaignId,
      tenant.userId,
      { db },
    );

    await writeAuditEvent(
      db,
      createRecallCampaignApprovedAuditEvent(tenant, campaign.id, {
        audienceCount: campaign.audienceCount,
        channel: campaign.channel,
        status: campaign.status,
      }),
    );

    redirectTo = `/dashboard/recall/campaigns/${campaign.id}?approved=1`;
  } catch (error) {
    await writeApprovalFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  revalidateCampaignPaths(redirectTo);
  redirect(redirectTo);
}

export async function cancelRecallCampaignAction(
  _previousState: RecallCampaignActionState,
  formData: FormData,
): Promise<RecallCampaignActionState> {
  let tenant: TenantContext | null = null;
  let redirectTo = "/dashboard/recall";

  try {
    tenant = await requirePermission("campaign:prepare");
    const campaignId = parseCampaignId(formData);
    const db = getPrismaClient() as unknown as RecallCampaignRepositoryDatabase & AuditLogDatabase;
    const campaign = await cancelRecallCampaignForTenant(
      tenant.tenantId,
      campaignId,
      tenant.userId,
      { db },
    );

    await writeAuditEvent(
      db,
      createRecallCampaignCancelledAuditEvent(tenant, campaign.id, {
        audienceCount: campaign.audienceCount,
        channel: campaign.channel,
        status: campaign.status,
      }),
    );

    redirectTo = `/dashboard/recall/campaigns/${campaign.id}?cancelled=1`;
  } catch (error) {
    await writeApprovalFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  revalidateCampaignPaths(redirectTo);
  redirect(redirectTo);
}

function parseCampaignForm(formData: FormData):
  | {
      name: string;
      channel: RecallCampaignChannel;
      selectedPatientIds: string[];
      fieldErrors?: undefined;
    }
  | {
      name?: string;
      channel?: RecallCampaignChannel;
      selectedPatientIds?: string[];
      fieldErrors: NonNullable<RecallCampaignActionState["fieldErrors"]>;
    } {
  const fieldErrors: NonNullable<RecallCampaignActionState["fieldErrors"]> = {};
  const name = normalizeCampaignName(formData.get("name"));
  const channelValue = String(formData.get("channel") ?? "")
    .trim()
    .toUpperCase();
  const channel = isRecallCampaignChannel(channelValue) ? channelValue : undefined;
  const selectedPatientIds = normalizeSelectedPatientIds(formData.getAll("patientIds"));

  if (!name) {
    fieldErrors.name = "Campaign name is required.";
  }

  if (!channel) {
    fieldErrors.channel = "Choose a valid campaign channel.";
  }

  if (selectedPatientIds.length === 0) {
    fieldErrors.patientIds = "Select at least one recall candidate.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      name,
      channel,
      selectedPatientIds,
      fieldErrors,
    };
  }

  return {
    name,
    channel: channel as RecallCampaignChannel,
    selectedPatientIds,
  };
}

function parseCampaignUpdateForm(formData: FormData):
  | {
      campaignId: string;
      name: string;
      channel: RecallCampaignChannel;
      template: string;
      fieldErrors?: undefined;
    }
  | {
      campaignId?: string;
      name?: string;
      channel?: RecallCampaignChannel;
      template?: string;
      fieldErrors: NonNullable<RecallCampaignActionState["fieldErrors"]>;
    } {
  const fieldErrors: NonNullable<RecallCampaignActionState["fieldErrors"]> = {};
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const name = normalizeCampaignName(formData.get("name"));
  const channelValue = String(formData.get("channel") ?? "")
    .trim()
    .toUpperCase();
  const channel = isRecallCampaignChannel(channelValue) ? channelValue : undefined;
  const template = normalizeCampaignMessageTemplate(formData.get("template"));

  if (!campaignId) {
    fieldErrors.campaignId = "Campaign selection is required.";
  }

  if (!name) {
    fieldErrors.name = "Campaign name is required.";
  }

  if (!channel) {
    fieldErrors.channel = "Choose a valid campaign channel.";
  }

  if (!template) {
    fieldErrors.template = "Message template is required.";
  } else if (template.length > 600) {
    fieldErrors.template = "Message template must be 600 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      campaignId,
      name,
      channel,
      template,
      fieldErrors,
    };
  }

  return {
    campaignId,
    name,
    channel: channel as RecallCampaignChannel,
    template,
  };
}

function parseCampaignId(formData: FormData): string {
  const campaignId = String(formData.get("campaignId") ?? "").trim();

  if (!campaignId) {
    throw new CampaignStatusTransitionError("Campaign selection is required.");
  }

  return campaignId;
}

async function writeCampaignCreatedAuditEvents(
  tenant: TenantContext,
  db: RecallCampaignRepositoryDatabase & AuditLogDatabase,
  campaignId: string,
  metadata: { audienceCount: number; channel: string; status: string },
) {
  try {
    await writeAuditEvent(
      db,
      createRecallCampaignAudienceValidatedAuditEvent(tenant, {
        audienceCount: metadata.audienceCount,
        channel: metadata.channel,
      }),
    );
    await writeAuditEvent(
      db,
      createRecallCampaignPatientSelectedAuditEvent(tenant, campaignId, {
        selectedCount: metadata.audienceCount,
      }),
    );
    await writeAuditEvent(
      db,
      createRecallCampaignDraftCreatedAuditEvent(tenant, campaignId, metadata),
    );
  } catch {
    // Draft creation should not fail because local audit persistence is unavailable.
  }
}

async function writeDraftUpdatedAuditEvents(
  tenant: TenantContext,
  db: RecallCampaignRepositoryDatabase & AuditLogDatabase,
  campaign: RecallCampaignDetail,
) {
  try {
    const metadata = {
      audienceCount: campaign.audienceCount,
      channel: campaign.channel,
      status: campaign.status,
      templateChanged: true,
    };

    await writeAuditEvent(
      db,
      createRecallCampaignDraftUpdatedAuditEvent(tenant, campaign.id, metadata),
    );
    await writeAuditEvent(
      db,
      createRecallCampaignMessageUpdatedAuditEvent(tenant, campaign.id, {
        channel: campaign.channel,
        status: campaign.status,
        templateChanged: true,
      }),
    );
  } catch {
    // Draft edits should not fail because local audit persistence is unavailable.
  }
}

async function writeCreateFailedAuditEvent(tenant: TenantContext | null, error: unknown) {
  if (!tenant) {
    return;
  }

  try {
    const db = getPrismaClient();
    await writeAuditEvent(
      db,
      createRecallCampaignCreateFailedAuditEvent(tenant, {
        reason: getSafeErrorReason(error),
        status: "failed",
      }),
    );
  } catch {
    // Failure handling must stay safe even when the database or audit table is unavailable.
  }
}

async function writeApprovalFailedAuditEvent(tenant: TenantContext | null, error: unknown) {
  if (!tenant) {
    return;
  }

  try {
    const db = getPrismaClient();
    await writeAuditEvent(
      db,
      createRecallCampaignApprovalFailedAuditEvent(tenant, {
        reason: getSafeErrorReason(error),
        status: "failed",
      }),
    );
  } catch {
    // Failure handling must stay safe even when the database or audit table is unavailable.
  }
}

function toCampaignActionError(error: unknown): RecallCampaignActionState {
  if (isAuthBoundaryError(error)) {
    return {
      status: "error",
      message: describeAuthBoundaryError(error),
    };
  }

  if (error instanceof CampaignAudienceValidationError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: { patientIds: error.message },
    };
  }

  if (error instanceof CampaignMessageValidationError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: { template: error.message },
    };
  }

  if (error instanceof CampaignStatusTransitionError) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (error instanceof DatabaseUnavailableError) {
    return {
      status: "error",
      message: "Campaign workflows require a configured database.",
    };
  }

  return {
    status: "error",
    message: "Campaign workflow could not be saved. Try again after reviewing the selection.",
  };
}

function getSafeErrorReason(error: unknown): string {
  if (isAuthBoundaryError(error)) {
    return "auth";
  }

  if (error instanceof CampaignAudienceValidationError) {
    return "audience_validation";
  }

  if (error instanceof CampaignMessageValidationError) {
    return "template_validation";
  }

  if (error instanceof CampaignStatusTransitionError) {
    return "status_transition";
  }

  if (error instanceof DatabaseUnavailableError) {
    return "database_unavailable";
  }

  return "unknown";
}

function revalidateCampaignPaths(redirectTo: string): void {
  revalidatePath("/dashboard/recall");
  revalidatePath("/dashboard/recall/campaigns/new");
  revalidatePath(redirectTo.split("?")[0] ?? "/dashboard/recall");
}
