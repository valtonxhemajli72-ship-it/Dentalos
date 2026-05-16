import { buildRecallWorkspaceSnapshot, type RecallQueueItem } from "@/modules/patients/recall";
import {
  listRecallCandidatesForTenant,
  type PatientRepositoryDatabase,
} from "@/modules/patients/repository";
import {
  CampaignAudienceValidationError,
  CampaignStatusTransitionError,
  assertValidCampaignMessageTemplate,
  canApproveCampaign,
  canCancelCampaign,
  canEditCampaignDraft,
  canSubmitCampaignForReview,
  isCampaignEligibleCandidate,
  isDefaultCampaignCandidate,
  prepareCampaignPreview,
  selectRecallCandidatesForCampaign,
  validateCampaignCanTransition,
  type CampaignReadiness,
  type CampaignReviewState,
  type RecallCampaignDetail,
  type RecallCampaignDraftInput,
  type RecallCampaignDraftUpdateInput,
  type RecallCampaignStatus,
  type RecallCampaignSummary,
} from "@/modules/recall";
import { assertTenantOwnedData, createTenantScopedWhere } from "@/modules/tenants";
import { getPrismaClient } from "@/server/db";

const MAX_CAMPAIGN_AUDIENCE = 100;

type RecallCampaignRecord = {
  id: string;
  tenantId: string;
  name: string;
  status: RecallCampaignStatus;
  channel?: "EMAIL" | "SMS" | "WHATSAPP" | "MANUAL";
  audienceCount?: number;
  messageTemplate?: string | null;
  templatePreview?: string | null;
  submittedForReviewAt?: Date | null;
  approvedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  selectedPatients?: Array<{
    id: string;
    patientId: string;
    recommendedAction: string;
    recallStatus: string;
    selectedAt: Date;
  }>;
};

export type RecallCampaignRepositoryDatabase = PatientRepositoryDatabase & {
  recallCampaign: {
    findMany(args: Record<string, unknown>): Promise<RecallCampaignRecord[]>;
    findFirst(args: Record<string, unknown>): Promise<RecallCampaignRecord | null>;
    create(args: Record<string, unknown>): Promise<RecallCampaignRecord>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
};

type RepositoryOptions = {
  db?: RecallCampaignRepositoryDatabase;
  asOf?: Date;
  take?: number;
};

export async function listRecallCampaignsForTenant(
  tenantId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignSummary[]> {
  const db = (options.db ?? getPrismaClient()) as RecallCampaignRepositoryDatabase;
  const records = await db.recallCampaign.findMany({
    where: createTenantScopedWhere(tenantId),
    orderBy: [{ createdAt: "desc" }],
    take: options.take ?? 10,
  });

  return records.map(mapRecallCampaignRecordToSummary);
}

export async function getRecallCampaignForTenant(
  tenantId: string,
  campaignId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail | null> {
  const db = (options.db ?? getPrismaClient()) as RecallCampaignRepositoryDatabase;
  const record = await db.recallCampaign.findFirst({
    where: createTenantScopedWhere(tenantId, { id: campaignId }),
    include: {
      selectedPatients: {
        where: { tenantId },
        orderBy: { selectedAt: "asc" },
      },
    },
  });

  return record ? mapRecallCampaignRecordToDetail(record) : null;
}

export async function validateCampaignAudienceForTenant(
  tenantId: string,
  selectedPatientIds: string[],
  options: RepositoryOptions = {},
): Promise<RecallQueueItem[]> {
  if (!tenantId) {
    throw new CampaignAudienceValidationError("Tenant context is required.");
  }

  if (selectedPatientIds.length === 0) {
    throw new CampaignAudienceValidationError("Select at least one recall candidate.");
  }

  if (selectedPatientIds.length > MAX_CAMPAIGN_AUDIENCE) {
    throw new CampaignAudienceValidationError(
      `Select ${MAX_CAMPAIGN_AUDIENCE} or fewer patients for this draft.`,
    );
  }

  const asOf = options.asOf ?? new Date();
  const candidates = await listRecallCandidatesForTenant(tenantId, asOf, {
    db: options.db,
    take: Math.max(options.take ?? 200, selectedPatientIds.length),
  });
  const queue = buildRecallWorkspaceSnapshot(candidates, asOf).queue;
  const selected = selectRecallCandidatesForCampaign(queue, selectedPatientIds);

  if (selected.missingCount > 0) {
    throw new CampaignAudienceValidationError(
      "Selected patients must belong to this clinic and be current recall candidates.",
    );
  }

  const ineligibleCount = selected.selected.filter(
    (candidate) => !isCampaignEligibleCandidate(candidate),
  ).length;

  if (ineligibleCount > 0) {
    throw new CampaignAudienceValidationError(
      "Selected patients must be eligible for recall campaign preparation.",
    );
  }

  return selected.selected;
}

export async function createRecallCampaignDraftForTenant(
  tenantId: string,
  input: RecallCampaignDraftInput,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  const db = (options.db ?? getPrismaClient()) as RecallCampaignRepositoryDatabase;
  const selectedCandidates = await validateCampaignAudienceForTenant(
    tenantId,
    input.selectedPatientIds,
    {
      ...options,
      db,
    },
  );
  const preview = prepareCampaignPreview({
    channel: input.channel,
    audienceCount: selectedCandidates.length,
  });
  const campaignData = {
    tenantId,
    name: input.name,
    status: "DRAFT",
    channel: input.channel,
    audienceCount: selectedCandidates.length,
    messageTemplate: preview.template,
    templatePreview: preview.preview,
    createdByUserId: input.actorUserId,
    selectedPatients: {
      create: selectedCandidates.map((candidate) => {
        const selectionData = {
          tenantId,
          patientId: candidate.id,
          recommendedAction: candidate.recommendedAction,
          recallStatus: candidate.status,
        };
        assertTenantOwnedData("RecallCampaignPatient", selectionData);
        return selectionData;
      }),
    },
  };
  assertTenantOwnedData("RecallCampaign", campaignData);

  const record = await db.recallCampaign.create({
    data: campaignData,
    include: {
      selectedPatients: {
        where: { tenantId },
        orderBy: { selectedAt: "asc" },
      },
    },
  });

  return mapRecallCampaignRecordToDetail(record);
}

export async function updateRecallCampaignDraftForTenant(
  tenantId: string,
  input: RecallCampaignDraftUpdateInput,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  if (!input.actorUserId) {
    throw new CampaignStatusTransitionError("Campaign updates require an actor.");
  }

  assertValidCampaignMessageTemplate(input.messageTemplate);

  const db = (options.db ?? getPrismaClient()) as RecallCampaignRepositoryDatabase;
  const campaign = await requireRecallCampaignForTenant(tenantId, input.campaignId, {
    ...options,
    db,
  });

  if (!canEditCampaignDraft(campaign.status)) {
    throw new CampaignStatusTransitionError("Only DRAFT campaigns can be edited.");
  }

  const campaignData = {
    tenantId,
    name: input.name,
    channel: input.channel,
    messageTemplate: input.messageTemplate,
    templatePreview: input.messageTemplate,
  };
  assertTenantOwnedData("RecallCampaign", campaignData);

  const result = await db.recallCampaign.updateMany({
    where: createTenantScopedWhere(tenantId, {
      id: input.campaignId,
      status: "DRAFT",
    }),
    data: {
      name: input.name,
      channel: input.channel,
      messageTemplate: input.messageTemplate,
      templatePreview: input.messageTemplate,
    },
  });

  if (result.count !== 1) {
    throw new CampaignStatusTransitionError("Only DRAFT campaigns can be edited.");
  }

  return requireRecallCampaignForTenant(tenantId, input.campaignId, { ...options, db });
}

export async function submitRecallCampaignForTenantReview(
  tenantId: string,
  campaignId: string,
  actorUserId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  if (!actorUserId) {
    throw new CampaignStatusTransitionError("Campaign review submission requires an actor.");
  }

  return transitionRecallCampaignForTenant({
    tenantId,
    campaignId,
    actorUserId,
    transition: "submit_for_review",
    nextStatus: "IN_REVIEW",
    updateData: {
      status: "IN_REVIEW",
      submittedForReviewAt: new Date(),
    },
    options,
  });
}

export async function approveRecallCampaignForTenant(
  tenantId: string,
  campaignId: string,
  actorUserId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  if (!actorUserId) {
    throw new CampaignStatusTransitionError("Campaign approval requires an actor.");
  }

  return transitionRecallCampaignForTenant({
    tenantId,
    campaignId,
    actorUserId,
    transition: "approve",
    nextStatus: "APPROVED",
    updateData: {
      status: "APPROVED",
      reviewedByUserId: actorUserId,
      approvedAt: new Date(),
    },
    options,
  });
}

export async function cancelRecallCampaignForTenant(
  tenantId: string,
  campaignId: string,
  actorUserId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  if (!actorUserId) {
    throw new CampaignStatusTransitionError("Campaign cancellation requires an actor.");
  }

  return transitionRecallCampaignForTenant({
    tenantId,
    campaignId,
    actorUserId,
    transition: "cancel",
    nextStatus: "CANCELLED",
    updateData: {
      status: "CANCELLED",
      cancelledByUserId: actorUserId,
      cancelledAt: new Date(),
      endedAt: new Date(),
    },
    options,
  });
}

export async function getRecallCampaignReviewStateForTenant(
  tenantId: string,
  campaignId: string,
  options: RepositoryOptions = {},
): Promise<CampaignReviewState | null> {
  const campaign = await getRecallCampaignForTenant(tenantId, campaignId, options);

  if (!campaign) {
    return null;
  }

  return {
    campaign,
    canEditDraft: canEditCampaignDraft(campaign.status),
    canSubmitForReview: canSubmitCampaignForReview(campaign.status),
    canApprove: canApproveCampaign(campaign.status),
    canCancel: canCancelCampaign(campaign.status),
    noSendNotice: "No messages are sent from this workflow.",
  };
}

export async function getCampaignReadinessForTenant(
  tenantId: string,
  options: RepositoryOptions = {},
): Promise<CampaignReadiness> {
  const asOf = options.asOf ?? new Date();
  const [candidates, campaigns] = await Promise.all([
    listRecallCandidatesForTenant(tenantId, asOf, {
      db: options.db,
      take: options.take ?? 100,
    }),
    listRecallCampaignsForTenant(tenantId, {
      db: options.db,
      take: 25,
    }),
  ]);
  const snapshot = buildRecallWorkspaceSnapshot(candidates, asOf);

  return {
    asOf,
    candidateCount: snapshot.queue.length,
    readyToContact: snapshot.campaignDraft.readyToContact,
    reviewRequired: snapshot.campaignDraft.reviewRequired,
    selectedByDefaultCount: snapshot.queue.filter(isDefaultCampaignCandidate).length,
    existingDraftCount: campaigns.filter((campaign) => campaign.status === "DRAFT").length,
    inReviewCount: campaigns.filter((campaign) => campaign.status === "IN_REVIEW").length,
    approvedCount: campaigns.filter((campaign) => campaign.status === "APPROVED").length,
  };
}

async function transitionRecallCampaignForTenant(input: {
  tenantId: string;
  campaignId: string;
  actorUserId: string;
  transition: "submit_for_review" | "approve" | "cancel";
  nextStatus: RecallCampaignStatus;
  updateData: Record<string, unknown>;
  options: RepositoryOptions;
}): Promise<RecallCampaignDetail> {
  const db = (input.options.db ?? getPrismaClient()) as RecallCampaignRepositoryDatabase;
  const campaign = await requireRecallCampaignForTenant(input.tenantId, input.campaignId, {
    ...input.options,
    db,
  });
  validateCampaignCanTransition(campaign.status, input.transition);

  const result = await db.recallCampaign.updateMany({
    where: createTenantScopedWhere(input.tenantId, {
      id: input.campaignId,
      status: campaign.status,
    }),
    data: input.updateData,
  });

  if (result.count !== 1) {
    throw new CampaignStatusTransitionError("Campaign status transition is not allowed.");
  }

  return requireRecallCampaignForTenant(input.tenantId, input.campaignId, {
    ...input.options,
    db,
  });
}

async function requireRecallCampaignForTenant(
  tenantId: string,
  campaignId: string,
  options: RepositoryOptions = {},
): Promise<RecallCampaignDetail> {
  const campaign = await getRecallCampaignForTenant(tenantId, campaignId, options);

  if (!campaign) {
    throw new CampaignStatusTransitionError("Campaign was not found for this clinic.");
  }

  return campaign;
}

function mapRecallCampaignRecordToSummary(record: RecallCampaignRecord): RecallCampaignSummary {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    status: record.status,
    channel: record.channel ?? "MANUAL",
    audienceCount: record.audienceCount ?? 0,
    messageTemplate: record.messageTemplate ?? undefined,
    templatePreview: record.templatePreview ?? undefined,
    submittedForReviewAt: record.submittedForReviewAt ?? undefined,
    approvedAt: record.approvedAt ?? undefined,
    cancelledAt: record.cancelledAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapRecallCampaignRecordToDetail(record: RecallCampaignRecord): RecallCampaignDetail {
  return {
    ...mapRecallCampaignRecordToSummary(record),
    selectedPatients: (record.selectedPatients ?? []).map((selection) => ({
      id: selection.id,
      patientId: selection.patientId,
      recommendedAction:
        selection.recommendedAction as RecallCampaignDetail["selectedPatients"][number]["recommendedAction"],
      recallStatus:
        selection.recallStatus as RecallCampaignDetail["selectedPatients"][number]["recallStatus"],
      selectedAt: selection.selectedAt,
    })),
  };
}
