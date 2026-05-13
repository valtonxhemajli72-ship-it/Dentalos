import type { PatientLifecycleStatus, PatientSummary } from "@/modules/patients";

export type RecallContactChannel = "email" | "sms" | "phone";

export type RecallStatus = "overdue" | "due_now" | "due_soon" | "scheduled" | "not_ready";

export type RecallAction =
  | "call_to_schedule"
  | "send_recall_message"
  | "send_gentle_nudge"
  | "confirm_upcoming_visit"
  | "wait";

export type RecallPatient = Omit<PatientSummary, "status"> & {
  lifecycleStatus: PatientLifecycleStatus;
  lastVisitAt?: Date;
  nextAppointmentAt?: Date;
  lastContactedAt?: Date;
  preferredChannel: RecallContactChannel;
  acceptsRecall: boolean;
  riskNote: string;
};

export type RecallQueueItem = RecallPatient & {
  daysUntilDue: number;
  status: RecallStatus;
  priorityScore: number;
  recommendedAction: RecallAction;
};

export type RecallWorkspaceSummary = {
  totalPatients: number;
  overdue: number;
  dueNow: number;
  dueSoon: number;
  scheduled: number;
  needsReview: number;
};

export type RecallWorkspaceSnapshot = {
  asOf: Date;
  summary: RecallWorkspaceSummary;
  queue: RecallQueueItem[];
  campaignDraft: {
    name: string;
    audience: string;
    readyToContact: number;
    reviewRequired: number;
  };
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW_DAYS = 30;
const CONTACT_COOLDOWN_DAYS = 14;

export function buildRecallWorkspaceSnapshot(
  patients: RecallPatient[],
  asOf: Date,
): RecallWorkspaceSnapshot {
  const queue = patients.map((patient) => buildRecallQueueItem(patient, asOf));
  const orderedQueue = [...queue].sort((first, second) => {
    if (second.priorityScore !== first.priorityScore) {
      return second.priorityScore - first.priorityScore;
    }

    return first.daysUntilDue - second.daysUntilDue;
  });

  const summary = orderedQueue.reduce<RecallWorkspaceSummary>(
    (current, item) => ({
      totalPatients: current.totalPatients + 1,
      overdue: current.overdue + (item.status === "overdue" ? 1 : 0),
      dueNow: current.dueNow + (item.status === "due_now" ? 1 : 0),
      dueSoon: current.dueSoon + (item.status === "due_soon" ? 1 : 0),
      scheduled: current.scheduled + (item.status === "scheduled" ? 1 : 0),
      needsReview: current.needsReview + (item.recommendedAction === "call_to_schedule" ? 1 : 0),
    }),
    {
      totalPatients: 0,
      overdue: 0,
      dueNow: 0,
      dueSoon: 0,
      scheduled: 0,
      needsReview: 0,
    },
  );

  return {
    asOf,
    summary,
    queue: orderedQueue,
    campaignDraft: {
      name: "May hygiene recall",
      audience: "Active patients due within 30 days or overdue",
      readyToContact: orderedQueue.filter(
        (item) => item.recommendedAction === "send_recall_message",
      ).length,
      reviewRequired: summary.needsReview,
    },
  };
}

export function buildRecallQueueItem(patient: RecallPatient, asOf: Date): RecallQueueItem {
  const daysUntilDue = daysBetween(asOf, patient.nextRecallDueAt);
  const status = getRecallStatus(patient, daysUntilDue);
  const recommendedAction = getRecommendedRecallAction(patient, status, asOf);
  const priorityScore = getPriorityScore(patient, status, recommendedAction, daysUntilDue);

  return {
    ...patient,
    daysUntilDue,
    status,
    priorityScore,
    recommendedAction,
  };
}

function getRecallStatus(patient: RecallPatient, daysUntilDue: number): RecallStatus {
  if (patient.nextAppointmentAt) {
    return "scheduled";
  }

  if (!patient.acceptsRecall || patient.lifecycleStatus === "inactive") {
    return "not_ready";
  }

  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue <= 7) {
    return "due_now";
  }

  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) {
    return "due_soon";
  }

  return "not_ready";
}

function getRecommendedRecallAction(
  patient: RecallPatient,
  status: RecallStatus,
  asOf: Date,
): RecallAction {
  if (status === "scheduled") {
    return "confirm_upcoming_visit";
  }

  if (status === "not_ready") {
    return "wait";
  }

  if (
    patient.lastContactedAt &&
    daysBetween(patient.lastContactedAt, asOf) < CONTACT_COOLDOWN_DAYS
  ) {
    return "send_gentle_nudge";
  }

  if (status === "overdue" && patient.preferredChannel === "phone") {
    return "call_to_schedule";
  }

  return "send_recall_message";
}

function getPriorityScore(
  patient: RecallPatient,
  status: RecallStatus,
  action: RecallAction,
  daysUntilDue: number,
): number {
  const statusWeight: Record<RecallStatus, number> = {
    overdue: 90,
    due_now: 70,
    due_soon: 45,
    scheduled: 15,
    not_ready: 0,
  };

  const actionWeight: Record<RecallAction, number> = {
    call_to_schedule: 20,
    send_recall_message: 14,
    send_gentle_nudge: 8,
    confirm_upcoming_visit: 4,
    wait: 0,
  };

  const overdueWeight = Math.max(0, Math.min(30, Math.abs(Math.min(daysUntilDue, 0))));
  const activeWeight =
    patient.lifecycleStatus === "active" || patient.lifecycleStatus === "overdue" ? 5 : 0;

  return statusWeight[status] + actionWeight[action] + overdueWeight + activeWeight;
}

function daysBetween(start: Date, end: Date | undefined): number {
  if (!end) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_IN_MS);
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
