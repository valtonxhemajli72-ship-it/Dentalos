"use server";

import { redirect } from "next/navigation";
import {
  CampaignAudienceValidationError,
  isRecallCampaignChannel,
  normalizeCampaignName,
  normalizeSelectedPatientIds,
  prepareCampaignPreview,
  type RecallCampaignChannel,
} from "@/modules/recall";
import {
  createRecallCampaignDraftForTenant,
  validateCampaignAudienceForTenant,
  type RecallCampaignRepositoryDatabase,
} from "@/modules/recall/repository";
import { describeAuthBoundaryError, isAuthBoundaryError, requirePermission } from "@/server/auth";
import {
  createRecallCampaignAudienceValidatedAuditEvent,
  createRecallCampaignCreateFailedAuditEvent,
  createRecallCampaignDraftCreatedAuditEvent,
  createRecallCampaignPatientSelectedAuditEvent,
  createRecallCampaignPreviewedAuditEvent,
  writeAuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";

export type RecallCampaignActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    name?: string;
    channel?: string;
    patientIds?: string;
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

    await writeCampaignAuditEvents(tenant, db, campaign.id, {
      audienceCount: campaign.audienceCount,
      channel: campaign.channel,
      status: campaign.status,
    });
  } catch (error) {
    await writeCreateFailedAuditEvent(tenant, error);
    return toCampaignActionError(error);
  }

  redirect("/dashboard/recall?campaignDraft=created");
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

async function writeCampaignAuditEvents(
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

  if (error instanceof DatabaseUnavailableError) {
    return {
      status: "error",
      message: "Campaign drafts require a configured database.",
    };
  }

  return {
    status: "error",
    message: "Campaign draft could not be saved. Try again after reviewing the selection.",
  };
}

function getSafeErrorReason(error: unknown): string {
  if (isAuthBoundaryError(error)) {
    return "auth";
  }

  if (error instanceof CampaignAudienceValidationError) {
    return "audience_validation";
  }

  if (error instanceof DatabaseUnavailableError) {
    return "database_unavailable";
  }

  return "unknown";
}
