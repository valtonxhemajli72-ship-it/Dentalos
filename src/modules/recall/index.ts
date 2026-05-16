import type { RecallAction, RecallQueueItem, RecallStatus } from "@/modules/patients/recall";

export type RecallCampaignChannel = "EMAIL" | "SMS" | "WHATSAPP" | "MANUAL";

export type RecallCampaignDraftInput = {
  name: string;
  channel: RecallCampaignChannel;
  selectedPatientIds: string[];
  actorUserId: string;
};

export type RecallCampaignSummary = {
  id: string;
  tenantId: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  channel: RecallCampaignChannel;
  audienceCount: number;
  templatePreview?: string;
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
};

export class CampaignAudienceValidationError extends Error {
  constructor(message = "Campaign audience is not valid for this tenant.") {
    super(message);
    this.name = "CampaignAudienceValidationError";
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

export function isRecallCampaignChannel(value: string): value is RecallCampaignChannel {
  return allowedCampaignChannels.has(value as RecallCampaignChannel);
}

export function normalizeCampaignName(value: FormDataEntryValue | string | null): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
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
