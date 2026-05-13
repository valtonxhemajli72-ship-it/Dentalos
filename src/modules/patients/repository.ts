import {
  type PatientDraft,
  type PatientImportNormalizedRow,
  normalizedPatientImportIdentityKey,
  normalizedPatientImportPhoneKey,
} from "@/modules/patient-import";
import type { PatientLifecycleStatus } from "@/modules/patients";
import type { RecallContactChannel, RecallPatient } from "@/modules/patients/recall";
import { getDemoRecallPatientsForTenant } from "@/modules/patients/recall-demo-data";
import { assertTenantOwnedData, createTenantScopedWhere } from "@/modules/tenants";
import { getPrismaClient } from "@/server/db";

type PrismaContactChannel = "EMAIL" | "SMS" | "PHONE";

type PatientRecord = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  lastVisitAt?: Date | null;
  nextRecallDueAt?: Date | null;
  preferredRecallChannel?: PrismaContactChannel;
  lastRecallContactedAt?: Date | null;
  recallOptOutAt?: Date | null;
  isActive: boolean;
  appointments?: Array<{
    startsAt: Date;
    status: string;
  }>;
};

export type PatientListItem = {
  id: string;
  tenantId: string;
  displayName: string;
  lifecycleStatus: PatientLifecycleStatus;
  contactIndicators: string[];
  lastVisitAt?: Date;
  nextRecallDueAt?: Date;
  nextAppointmentAt?: Date;
};

export type PatientImportDuplicateMatch = {
  rowNumber: number;
  existingPatientId: string;
  reasons: Array<"email" | "phone" | "identity">;
};

export type PatientRepositoryDatabase = {
  patient: {
    findMany(args: Record<string, unknown>): Promise<PatientRecord[]>;
    findFirst(args: Record<string, unknown>): Promise<PatientRecord | null>;
    create(args: Record<string, unknown>): Promise<PatientRecord>;
  };
  appointment: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

type RepositoryOptions = {
  db?: PatientRepositoryDatabase;
  take?: number;
};

export async function listPatientsForTenant(
  tenantId: string,
  options: RepositoryOptions = {},
): Promise<PatientListItem[]> {
  const db = (options.db ?? getPrismaClient()) as PatientRepositoryDatabase;
  const records = await db.patient.findMany({
    where: createTenantScopedWhere(tenantId),
    include: upcomingAppointmentInclude(tenantId),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: options.take ?? 100,
  });

  return records.map(mapPatientRecordToListItem);
}

export async function getPatientForTenant(
  tenantId: string,
  patientId: string,
  options: RepositoryOptions = {},
): Promise<PatientListItem | null> {
  const db = (options.db ?? getPrismaClient()) as PatientRepositoryDatabase;
  const record = await db.patient.findFirst({
    where: createTenantScopedWhere(tenantId, { id: patientId }),
    include: upcomingAppointmentInclude(tenantId),
  });

  return record ? mapPatientRecordToListItem(record) : null;
}

export async function createPatientsForTenant(
  tenantId: string,
  drafts: PatientDraft[],
  _actorUserId?: string,
  options: RepositoryOptions = {},
): Promise<{ count: number }> {
  const db = (options.db ?? getPrismaClient()) as PatientRepositoryDatabase;
  let createdCount = 0;

  for (const draft of drafts) {
    const patientData = {
      tenantId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      lastVisitAt: draft.lastVisitAt,
      nextRecallDueAt: inferNextRecallDueAt(draft.lastVisitAt),
      preferredRecallChannel: toPrismaContactChannel(draft.preferredContactChannel),
      acceptsEmail: Boolean(draft.email),
      acceptsSms: draft.preferredContactChannel === "sms" && Boolean(draft.phone),
      isActive: true,
    };
    assertTenantOwnedData("Patient", patientData);

    const patient = await db.patient.create({
      data: patientData,
    });

    if (draft.nextAppointmentAt) {
      const appointmentData = {
        tenantId,
        patientId: patient.id,
        startsAt: draft.nextAppointmentAt,
        status: "SCHEDULED",
      };
      assertTenantOwnedData("Appointment", appointmentData);

      await db.appointment.create({
        data: appointmentData,
      });
    }

    createdCount += 1;
  }

  return { count: createdCount };
}

export async function listRecallCandidatesForTenant(
  tenantId: string,
  asOf: Date,
  options: RepositoryOptions & { dueWithinDays?: number } = {},
): Promise<RecallPatient[]> {
  const db = (options.db ?? getPrismaClient()) as PatientRepositoryDatabase;
  const dueWithinDays = options.dueWithinDays ?? 30;
  const dueThrough = new Date(asOf);
  dueThrough.setUTCDate(dueThrough.getUTCDate() + dueWithinDays);

  const records = await db.patient.findMany({
    where: createTenantScopedWhere(tenantId, {
      isActive: true,
      recallOptOutAt: null,
      nextRecallDueAt: {
        lte: dueThrough,
      },
    }),
    include: upcomingAppointmentInclude(tenantId),
    orderBy: [{ nextRecallDueAt: "asc" }, { lastName: "asc" }],
    take: options.take ?? 100,
  });

  return records.map((record) => mapPatientRecordToRecallPatient(record, asOf));
}

export async function findPotentialDuplicatePatientsForTenant(
  tenantId: string,
  normalizedRows: PatientImportNormalizedRow[],
  options: RepositoryOptions = {},
): Promise<PatientImportDuplicateMatch[]> {
  const db = (options.db ?? getPrismaClient()) as PatientRepositoryDatabase;
  const emailRows = new Map<string, number>();
  const phoneRows = new Map<string, number>();
  const identityRows = new Map<string, number>();
  const orConditions: Record<string, unknown>[] = [];

  normalizedRows.forEach((row) => {
    if (row.email) {
      emailRows.set(row.email, row.rowNumber);
      orConditions.push({ email: row.email });
    }

    const phoneKey = normalizedPatientImportPhoneKey(row.phone);
    if (phoneKey && row.phone) {
      phoneRows.set(phoneKey, row.rowNumber);
      orConditions.push({ phone: row.phone });
    }

    const identityKey = normalizedPatientImportIdentityKey(row);
    if (identityKey && row.lastVisitDate) {
      identityRows.set(identityKey, row.rowNumber);
      orConditions.push({
        firstName: row.firstName,
        lastName: row.lastName,
        lastVisitAt: new Date(`${row.lastVisitDate}T00:00:00.000Z`),
      });
    }
  });

  if (orConditions.length === 0) {
    return [];
  }

  const existingPatients = await db.patient.findMany({
    where: createTenantScopedWhere(tenantId, {
      OR: orConditions,
    }),
    take: options.take ?? 200,
  });

  const matches = new Map<number, PatientImportDuplicateMatch>();

  existingPatients.forEach((patient) => {
    addDuplicateMatch(matches, emailRows.get(patient.email ?? ""), patient.id, "email");
    addDuplicateMatch(
      matches,
      phoneRows.get(normalizedPatientImportPhoneKey(patient.phone ?? undefined) ?? ""),
      patient.id,
      "phone",
    );

    const identityKey = normalizedPatientImportIdentityKey({
      firstName: patient.firstName,
      lastName: patient.lastName,
      lastVisitDate: patient.lastVisitAt?.toISOString().slice(0, 10),
    });
    addDuplicateMatch(matches, identityRows.get(identityKey ?? ""), patient.id, "identity");
  });

  return Array.from(matches.values());
}

export function listDemoRecallCandidatesForTenant(tenantId: string): RecallPatient[] {
  return getDemoRecallPatientsForTenant(tenantId);
}

export function mapRecallPatientToPatientListItem(patient: RecallPatient): PatientListItem {
  return {
    id: patient.id,
    tenantId: patient.tenantId,
    displayName: patient.displayName,
    lifecycleStatus: patient.lifecycleStatus,
    contactIndicators: [patient.preferredChannel.toUpperCase()],
    lastVisitAt: patient.lastVisitAt,
    nextRecallDueAt: patient.nextRecallDueAt,
    nextAppointmentAt: patient.nextAppointmentAt,
  };
}

function upcomingAppointmentInclude(tenantId: string) {
  return {
    appointments: {
      where: {
        tenantId,
        status: {
          in: ["SCHEDULED", "CONFIRMED"],
        },
      },
      orderBy: {
        startsAt: "asc",
      },
      take: 1,
    },
  };
}

function mapPatientRecordToListItem(record: PatientRecord): PatientListItem {
  return {
    id: record.id,
    tenantId: record.tenantId,
    displayName: buildPatientDisplayName(record),
    lifecycleStatus: getLifecycleStatus(record, new Date()),
    contactIndicators: buildContactIndicators(record),
    lastVisitAt: record.lastVisitAt ?? undefined,
    nextRecallDueAt: record.nextRecallDueAt ?? undefined,
    nextAppointmentAt: record.appointments?.[0]?.startsAt,
  };
}

function mapPatientRecordToRecallPatient(record: PatientRecord, asOf: Date): RecallPatient {
  const nextAppointmentAt = record.appointments?.[0]?.startsAt;

  return {
    id: record.id,
    tenantId: record.tenantId,
    displayName: buildPatientDisplayName(record),
    lifecycleStatus: getLifecycleStatus(record, asOf),
    lastVisitAt: record.lastVisitAt ?? undefined,
    nextRecallDueAt: record.nextRecallDueAt ?? undefined,
    nextAppointmentAt,
    lastContactedAt: record.lastRecallContactedAt ?? undefined,
    preferredChannel: fromPrismaContactChannel(record.preferredRecallChannel),
    acceptsRecall: !record.recallOptOutAt,
    riskNote: buildRecallReason(record, nextAppointmentAt, asOf),
  };
}

function buildPatientDisplayName(record: Pick<PatientRecord, "firstName" | "lastName">): string {
  const initials = [record.firstName.at(0), record.lastName.at(0)]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials ? `Patient ${initials}` : "Patient";
}

function buildContactIndicators(record: PatientRecord): string[] {
  const indicators: string[] = [];

  if (record.email) {
    indicators.push("Email on file");
  }

  if (record.phone) {
    indicators.push("Phone on file");
  }

  return indicators.length > 0 ? indicators : ["No contact method"];
}

function getLifecycleStatus(record: PatientRecord, asOf: Date): PatientLifecycleStatus {
  if (!record.isActive) {
    return "inactive";
  }

  if (!record.nextRecallDueAt) {
    return "active";
  }

  const daysUntilDue = Math.ceil(
    (startOfDay(record.nextRecallDueAt).getTime() - startOfDay(asOf).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue <= 30) {
    return "due_for_recall";
  }

  return "active";
}

function buildRecallReason(record: PatientRecord, nextAppointmentAt: Date | undefined, asOf: Date) {
  if (nextAppointmentAt) {
    return "Already scheduled; confirm attendance instead of recall.";
  }

  if (!record.nextRecallDueAt) {
    return "No recall due date is set.";
  }

  if (record.nextRecallDueAt < asOf) {
    return "Overdue recall patient.";
  }

  return "Due soon and suitable for campaign review.";
}

function toPrismaContactChannel(channel: PatientDraft["preferredContactChannel"]) {
  return channel.toUpperCase() as PrismaContactChannel;
}

function fromPrismaContactChannel(channel: PrismaContactChannel | undefined): RecallContactChannel {
  return (channel?.toLowerCase() as RecallContactChannel | undefined) ?? "email";
}

function inferNextRecallDueAt(lastVisitAt: Date | undefined): Date | undefined {
  if (!lastVisitAt) {
    return undefined;
  }

  const dueAt = new Date(lastVisitAt);
  dueAt.setUTCMonth(dueAt.getUTCMonth() + 6);
  return dueAt;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDuplicateMatch(
  matches: Map<number, PatientImportDuplicateMatch>,
  rowNumber: number | undefined,
  existingPatientId: string,
  reason: PatientImportDuplicateMatch["reasons"][number],
) {
  if (!rowNumber) {
    return;
  }

  const existing = matches.get(rowNumber);

  if (existing) {
    existing.reasons.push(reason);
    return;
  }

  matches.set(rowNumber, {
    rowNumber,
    existingPatientId,
    reasons: [reason],
  });
}
