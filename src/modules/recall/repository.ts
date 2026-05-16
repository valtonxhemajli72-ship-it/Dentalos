import { buildRecallWorkspaceSnapshot, type RecallQueueItem } from "@/modules/patients/recall";
import {
  listRecallCandidatesForTenant,
  type PatientRepositoryDatabase,
} from "@/modules/patients/repository";
import {
  CampaignAudienceValidationError,
  isCampaignEligibleCandidate,
  isDefaultCampaignCandidate,
  prepareCampaignPreview,
  selectRecallCandidatesForCampaign,
  type CampaignReadiness,
  type RecallCampaignDetail,
  type RecallCampaignDraftInput,
  type RecallCampaignSummary,
} from "@/modules/recall";
import { assertTenantOwnedData, createTenantScopedWhere } from "@/modules/tenants";
import { getPrismaClient } from "@/server/db";

const MAX_CAMPAIGN_AUDIENCE = 100;

type RecallCampaignRecord = {
  id: string;
  tenantId: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  channel?: "EMAIL" | "SMS" | "WHATSAPP" | "MANUAL";
  audienceCount?: number;
  templatePreview?: string | null;
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
  };
}

function mapRecallCampaignRecordToSummary(record: RecallCampaignRecord): RecallCampaignSummary {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    status: record.status,
    channel: record.channel ?? "MANUAL",
    audienceCount: record.audienceCount ?? 0,
    templatePreview: record.templatePreview ?? undefined,
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
