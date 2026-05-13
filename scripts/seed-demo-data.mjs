import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tenantId = "tenant_demo_riverside";
const userId = "user_demo_owner";

async function main() {
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: "Riverside Demo Dental",
      slug: "riverside-demo",
    },
    create: {
      id: tenantId,
      name: "Riverside Demo Dental",
      slug: "riverside-demo",
    },
  });

  await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: "owner@example.test",
      name: "Demo Owner",
    },
    create: {
      id: userId,
      email: "owner@example.test",
      name: "Demo Owner",
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      id: "membership_demo_owner",
      tenantId,
      userId,
      role: "OWNER",
    },
  });

  await seedPatients();
  await seedAppointments();
  await seedRecallCampaigns();
  await seedNotifications();
  await seedImportBatch();
}

async function seedPatients() {
  const patients = [
    {
      id: "pat_demo_seed_001",
      firstName: "Patient",
      lastName: "A",
      email: "patient-a@example.test",
      phone: "+1555010101",
      lastVisitAt: new Date("2025-09-03T00:00:00.000Z"),
      nextRecallDueAt: new Date("2026-03-03T00:00:00.000Z"),
      preferredRecallChannel: "PHONE",
      acceptsEmail: true,
      acceptsSms: false,
    },
    {
      id: "pat_demo_seed_002",
      firstName: "Patient",
      lastName: "B",
      email: "patient-b@example.test",
      phone: "+1555010102",
      lastVisitAt: new Date("2025-11-18T00:00:00.000Z"),
      nextRecallDueAt: new Date("2026-05-18T00:00:00.000Z"),
      preferredRecallChannel: "SMS",
      acceptsEmail: true,
      acceptsSms: true,
    },
    {
      id: "pat_demo_seed_003",
      firstName: "Patient",
      lastName: "C",
      email: "patient-c@example.test",
      phone: "+1555010103",
      lastVisitAt: new Date("2025-12-09T00:00:00.000Z"),
      nextRecallDueAt: new Date("2026-06-09T00:00:00.000Z"),
      preferredRecallChannel: "EMAIL",
      acceptsEmail: true,
      acceptsSms: false,
    },
  ];

  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: {
        ...patient,
        tenantId,
        isActive: true,
      },
      create: {
        ...patient,
        tenantId,
        isActive: true,
      },
    });
  }
}

async function seedAppointments() {
  await prisma.appointment.upsert({
    where: { id: "appt_demo_seed_001" },
    update: {
      tenantId,
      patientId: "pat_demo_seed_002",
      startsAt: new Date("2026-05-22T14:00:00.000Z"),
      endsAt: new Date("2026-05-22T14:30:00.000Z"),
      status: "CONFIRMED",
    },
    create: {
      id: "appt_demo_seed_001",
      tenantId,
      patientId: "pat_demo_seed_002",
      startsAt: new Date("2026-05-22T14:00:00.000Z"),
      endsAt: new Date("2026-05-22T14:30:00.000Z"),
      status: "CONFIRMED",
    },
  });
}

async function seedRecallCampaigns() {
  await prisma.recallCampaign.upsert({
    where: { id: "campaign_demo_seed_001" },
    update: {
      tenantId,
      name: "May hygiene recall",
      status: "DRAFT",
      startsAt: new Date("2026-05-20T00:00:00.000Z"),
    },
    create: {
      id: "campaign_demo_seed_001",
      tenantId,
      name: "May hygiene recall",
      status: "DRAFT",
      startsAt: new Date("2026-05-20T00:00:00.000Z"),
    },
  });
}

async function seedNotifications() {
  await prisma.notificationMessage.upsert({
    where: { id: "message_demo_seed_001" },
    update: {
      tenantId,
      patientId: "pat_demo_seed_001",
      recallCampaignId: "campaign_demo_seed_001",
      channel: "PHONE",
      status: "DRAFT",
      bodyPreview: "Manual phone follow-up prepared for recall scheduling.",
    },
    create: {
      id: "message_demo_seed_001",
      tenantId,
      patientId: "pat_demo_seed_001",
      recallCampaignId: "campaign_demo_seed_001",
      channel: "PHONE",
      status: "DRAFT",
      bodyPreview: "Manual phone follow-up prepared for recall scheduling.",
    },
  });
}

async function seedImportBatch() {
  await prisma.patientImportBatch.upsert({
    where: { id: "import_batch_demo_seed_001" },
    update: {
      tenantId,
      createdByUserId: userId,
      status: "VALIDATED",
      source: "demo_csv",
      rowCount: 3,
      validRowCount: 3,
      invalidRowCount: 0,
    },
    create: {
      id: "import_batch_demo_seed_001",
      tenantId,
      createdByUserId: userId,
      status: "VALIDATED",
      source: "demo_csv",
      rowCount: 3,
      validRowCount: 3,
      invalidRowCount: 0,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Demo seed failed. Check DATABASE_URL and that the schema is migrated.");
    if (process.env.NODE_ENV === "development") {
      console.error(error?.name ?? "Unknown seed error");
    }
    await prisma.$disconnect();
    process.exit(1);
  });
