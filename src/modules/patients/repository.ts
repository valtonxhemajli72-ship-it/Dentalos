import type { PatientDraft } from "@/modules/patient-import";
import type { RecallPatient } from "@/modules/patients/recall";
import { getDemoRecallPatientsForTenant } from "@/modules/patients/recall-demo-data";
import { assertTenantScopedInput, createTenantScopedWhere } from "@/modules/tenants";

type PatientRecord = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  lastVisitAt?: Date | null;
  nextRecallDueAt?: Date | null;
  preferredRecallChannel?: "EMAIL" | "SMS" | "PHONE";
  lastRecallContactedAt?: Date | null;
  recallOptOutAt?: Date | null;
  isActive: boolean;
};

type PatientCreateInput = {
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  lastVisitAt?: Date;
  preferredRecallChannel: "EMAIL" | "SMS" | "PHONE";
  isActive: boolean;
};

export type PatientRepositoryDatabase = {
  patient: {
    findMany(args: Record<string, unknown>): Promise<PatientRecord[]>;
    findFirst(args: Record<string, unknown>): Promise<PatientRecord | null>;
    createMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
};

export async function listPatientsForTenant(
  db: PatientRepositoryDatabase,
  tenantId: string,
): Promise<PatientRecord[]> {
  return db.patient.findMany({
    where: createTenantScopedWhere(tenantId),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getPatientForTenant(
  db: PatientRepositoryDatabase,
  tenantId: string,
  patientId: string,
): Promise<PatientRecord | null> {
  return db.patient.findFirst({
    where: createTenantScopedWhere(tenantId, { id: patientId }),
  });
}

export async function createPatientsForTenant(
  db: PatientRepositoryDatabase,
  tenantId: string,
  drafts: PatientDraft[],
): Promise<{ count: number }> {
  const data = drafts.map((draft) => {
    assertTenantScopedInput(draft, tenantId);

    return {
      tenantId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      lastVisitAt: draft.lastVisitAt,
      preferredRecallChannel: toPrismaContactChannel(draft.preferredContactChannel),
      isActive: true,
    } satisfies PatientCreateInput;
  });

  return db.patient.createMany({ data });
}

export async function listRecallCandidatesForTenant(
  db: PatientRepositoryDatabase,
  tenantId: string,
  asOf: Date,
  options: { dueWithinDays?: number; take?: number } = {},
): Promise<PatientRecord[]> {
  const dueWithinDays = options.dueWithinDays ?? 30;
  const dueThrough = new Date(asOf);
  dueThrough.setUTCDate(dueThrough.getUTCDate() + dueWithinDays);

  return db.patient.findMany({
    where: createTenantScopedWhere(tenantId, {
      isActive: true,
      recallOptOutAt: null,
      nextRecallDueAt: {
        lte: dueThrough,
      },
    }),
    orderBy: [{ nextRecallDueAt: "asc" }, { lastName: "asc" }],
    take: options.take ?? 100,
  });
}

export function listDemoRecallCandidatesForTenant(tenantId: string): RecallPatient[] {
  return getDemoRecallPatientsForTenant(tenantId);
}

function toPrismaContactChannel(channel: PatientDraft["preferredContactChannel"]) {
  return channel.toUpperCase() as "EMAIL" | "SMS" | "PHONE";
}
