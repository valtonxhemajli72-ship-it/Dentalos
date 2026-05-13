import {
  buildRecallWorkspaceSnapshot,
  type RecallPatient,
  type RecallWorkspaceSnapshot,
} from "@/modules/patients/recall";

export const recallDemoAsOf = new Date("2026-05-14T00:00:00.000Z");

const demoPatients: RecallPatient[] = [
  {
    id: "pat_demo_001",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient AM",
    lifecycleStatus: "overdue",
    lastVisitAt: new Date("2025-09-03T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-03-03T00:00:00.000Z"),
    preferredChannel: "phone",
    acceptsRecall: true,
    riskNote: "Overdue hygiene recall with phone preference.",
  },
  {
    id: "pat_demo_002",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient KL",
    lifecycleStatus: "due_for_recall",
    lastVisitAt: new Date("2025-11-18T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-05-18T00:00:00.000Z"),
    preferredChannel: "sms",
    acceptsRecall: true,
    riskNote: "Due this week and eligible for reminder.",
  },
  {
    id: "pat_demo_003",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient RS",
    lifecycleStatus: "due_for_recall",
    lastVisitAt: new Date("2025-11-28T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-05-28T00:00:00.000Z"),
    lastContactedAt: new Date("2026-05-05T00:00:00.000Z"),
    preferredChannel: "email",
    acceptsRecall: true,
    riskNote: "Recently contacted; keep outreach gentle.",
  },
  {
    id: "pat_demo_004",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient TN",
    lifecycleStatus: "active",
    lastVisitAt: new Date("2025-12-09T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-06-09T00:00:00.000Z"),
    preferredChannel: "email",
    acceptsRecall: true,
    riskNote: "Due soon and suitable for campaign batch.",
  },
  {
    id: "pat_demo_005",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient VO",
    lifecycleStatus: "active",
    lastVisitAt: new Date("2025-11-20T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-05-20T00:00:00.000Z"),
    nextAppointmentAt: new Date("2026-05-22T00:00:00.000Z"),
    preferredChannel: "sms",
    acceptsRecall: true,
    riskNote: "Already scheduled; confirm attendance instead of recall.",
  },
  {
    id: "pat_demo_006",
    tenantId: "tenant_demo_riverside",
    displayName: "Patient CY",
    lifecycleStatus: "inactive",
    lastVisitAt: new Date("2024-07-12T00:00:00.000Z"),
    nextRecallDueAt: new Date("2025-01-12T00:00:00.000Z"),
    preferredChannel: "phone",
    acceptsRecall: false,
    riskNote: "Inactive and not eligible for automated outreach.",
  },
];

export function getDemoRecallPatientsForTenant(tenantId: string): RecallPatient[] {
  return demoPatients.map((patient) => ({
    ...patient,
    tenantId,
  }));
}

export function getDemoRecallWorkspaceSnapshot(): RecallWorkspaceSnapshot {
  return buildRecallWorkspaceSnapshot(demoPatients, recallDemoAsOf);
}
