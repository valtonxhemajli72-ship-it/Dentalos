import type { RecallAction, RecallQueueItem, RecallStatus } from "@/modules/patients/recall";

export type RecallCampaignChannel = "EMAIL" | "SMS" | "WHATSAPP" | "MANUAL";
export type RecallCampaignStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "CANCELLED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED";

export type CampaignStatusTransition = "submit_for_review" | "approve" | "cancel";

export type RecallCampaignDraftInput = {
  name: string;
  channel: RecallCampaignChannel;
  selectedPatientIds: string[];
  actorUserId: string;
};

export type RecallCampaignDraftUpdateInput = {
  campaignId: string;
  name: string;
  channel: RecallCampaignChannel;
  messageTemplate: string;
  actorUserId: string;
};

export type RecallCampaignSummary = {
  id: string;
  tenantId: string;
  name: string;
  status: RecallCampaignStatus;
  channel: RecallCampaignChannel;
  audienceCount: number;
  messageTemplate?: string;
  templatePreview?: string;
  submittedForReviewAt?: Date;
  approvedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type RecallCampaignDetail = RecallCampaignSummary & {
  selectedPatients: Array<{
    id: string;
    patientId: string;
    recommendedAction: RecallAction;
    recallStatus: RecallStatus;
    selectedAt: Date;
  }>;
};

export type CampaignPreview = {
  channel: RecallCampaignChannel;
  channelLabel: string;
  template: string;
  preview: string;
  audienceCount: number;
  noSendNotice: string;
};

export type CampaignReadiness = {
  asOf: Date;
  candidateCount: number;
  readyToContact: number;
  reviewRequired: number;
  selectedByDefaultCount: number;
  existingDraftCount: number;
  inReviewCount: number;
  approvedCount: number;
};

export type CampaignReviewState = {
  campaign: RecallCampaignDetail;
  canEditDraft: boolean;
  canSubmitForReview: boolean;
  canApprove: boolean;
  canCancel: boolean;
  noSendNotice: string;
};

export class CampaignAudienceValidationError extends Error {
  constructor(message = "Campaign audience is not valid for this tenant.") {
    super(message);
    this.name = "CampaignAudienceValidationError";
  }
}

export class CampaignMessageValidationError extends Error {
  constructor(message = "Campaign message template is not valid.") {
    super(message);
    this.name = "CampaignMessageValidationError";
  }
}

export class CampaignStatusTransitionError extends Error {
  constructor(message = "Campaign status transition is not allowed.") {
    super(message);
    this.name = "CampaignStatusTransitionError";
  }
}

export const campaignChannelOptions: Array<{
  value: RecallCampaignChannel;
  label: string;
  description: string;
}> = [
  {
    value: "SMS",
    label: "SMS",
    description: "Short reminder draft only; no SMS is sent.",
  },
  {
    value: "EMAIL",
    label: "Email",
    description: "Email-style draft only; no email is sent.",
  },
  {
    value: "WHATSAPP",
    label: "WhatsApp",
    description: "WhatsApp-style draft only; no WhatsApp message is sent.",
  },
  {
    value: "MANUAL",
    label: "Manual call",
    description: "Receptionist call script for manual scheduling work.",
  },
];

const allowedCampaignChannels = new Set<RecallCampaignChannel>(
  campaignChannelOptions.map((option) => option.value),
);

const defaultSelectedActions = new Set<RecallAction>(["send_recall_message", "send_gentle_nudge"]);

const campaignEligibleActions = new Set<RecallAction>([
  "send_recall_message",
  "send_gentle_nudge",
  "call_to_schedule",
]);

const editableCampaignStatuses = new Set<RecallCampaignStatus>(["DRAFT"]);
const cancellableCampaignStatuses = new Set<RecallCampaignStatus>([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
]);
export const MAX_CAMPAIGN_MESSAGE_TEMPLATE_LENGTH = 600;

export function isRecallCampaignChannel(value: string): value is RecallCampaignChannel {
  return allowedCampaignChannels.has(value as RecallCampaignChannel);
}

export function normalizeCampaignName(value: FormDataEntryValue | string | null): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function normalizeCampaignMessageTemplate(
  value: FormDataEntryValue | string | null,
): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function normalizeSelectedPatientIds(values: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const value of values) {
    const id = String(value ?? "").trim();

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export function selectRecallCandidatesForCampaign(
  candidates: RecallQueueItem[],
  selectedPatientIds: string[],
): { selected: RecallQueueItem[]; missingCount: number } {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selected = selectedPatientIds
    .map((patientId) => candidateById.get(patientId))
    .filter((candidate): candidate is RecallQueueItem => Boolean(candidate));

  return {
    selected,
    missingCount: selectedPatientIds.length - selected.length,
  };
}

export function isDefaultCampaignCandidate(candidate: RecallQueueItem): boolean {
  return defaultSelectedActions.has(candidate.recommendedAction);
}

export function isCampaignEligibleCandidate(candidate: RecallQueueItem): boolean {
  return (
    campaignEligibleActions.has(candidate.recommendedAction) &&
    candidate.acceptsRecall &&
    candidate.status !== "scheduled" &&
    candidate.status !== "not_ready"
  );
}

export function assertValidCampaignMessageTemplate(messageTemplate: string): void {
  if (!messageTemplate) {
    throw new CampaignMessageValidationError("Message template is required.");
  }

  if (messageTemplate.length > MAX_CAMPAIGN_MESSAGE_TEMPLATE_LENGTH) {
    throw new CampaignMessageValidationError(
      `Message template must be ${MAX_CAMPAIGN_MESSAGE_TEMPLATE_LENGTH} characters or fewer.`,
    );
  }
}

export function canEditCampaignDraft(status: RecallCampaignStatus): boolean {
  return editableCampaignStatuses.has(status);
}

export function canSubmitCampaignForReview(status: RecallCampaignStatus): boolean {
  return status === "DRAFT";
}

export function canApproveCampaign(status: RecallCampaignStatus): boolean {
  return status === "IN_REVIEW";
}

export function canCancelCampaign(status: RecallCampaignStatus): boolean {
  return cancellableCampaignStatuses.has(status);
}

export function validateCampaignCanTransition(
  status: RecallCampaignStatus,
  transition: CampaignStatusTransition,
): void {
  const allowed =
    (transition === "submit_for_review" && canSubmitCampaignForReview(status)) ||
    (transition === "approve" && canApproveCampaign(status)) ||
    (transition === "cancel" && canCancelCampaign(status));

  if (!allowed) {
    throw new CampaignStatusTransitionError("Campaign status transition is not allowed.");
  }
}

export function prepareCampaignPreview(input: {
  channel: RecallCampaignChannel;
  audienceCount: number;
}): CampaignPreview {
  const channel = campaignChannelOptions.find((option) => option.value === input.channel);
  const channelLabel = channel?.label ?? "Manual call";

  const templateByChannel: Record<RecallCampaignChannel, string> = {
    SMS: "Klinika360 reminder: a routine recall visit may be due. Please contact the clinic to choose a convenient time.",
    EMAIL:
      "Subject: Time to schedule your dental recall\n\nHello, this is a reminder from Klinika360 that a routine recall visit may be due. Please contact the clinic to choose a convenient time.",
    WHATSAPP:
      "Klinika360 reminder: a routine recall visit may be due. Please contact the clinic to choose a convenient time.",
    MANUAL:
      "Call script: confirm the patient is ready to schedule a recall visit, offer available times, and record whether manual follow-up is needed.",
  };

  return {
    channel: input.channel,
    channelLabel,
    template: templateByChannel[input.channel],
    preview: templateByChannel[input.channel],
    audienceCount: input.audienceCount,
    noSendNotice: "No messages are sent from this workflow.",
  };
}
