import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const primaryTenantId = "tenant_demo_klinika360";
const specialistsTenantId = "tenant_demo_klinika360_specialists";
const demoOwnerUserId = "user_demo_klinika360_owner";

const tenants = [
  {
    id: primaryTenantId,
    name: "Klinika360",
    slug: "klinika360-demo",
  },
  {
    id: specialistsTenantId,
    name: "Klinika360 Specialists",
    slug: "klinika360-specialists-demo",
  },
];

const users = [
  {
    id: demoOwnerUserId,
    email: "demo-user@example.test",
    name: "Klinika360 Demo User",
  },
  {
    id: "user_demo_klinika360_admin",
    email: "admin@example.test",
    name: "Demo Admin User",
  },
  {
    id: "user_demo_klinika360_doctor",
    email: "doctor@example.test",
    name: "Demo Doctor User",
  },
  {
    id: "user_demo_klinika360_receptionist",
    email: "receptionist@example.test",
    name: "Demo Reception User",
  },
  {
    id: "user_demo_klinika360_manager",
    email: "manager@example.test",
    name: "Demo Manager User",
  },
  {
    id: "user_demo_klinika360_staff",
    email: "staff@example.test",
    name: "Demo Staff User",
  },
  {
    id: "user_demo_klinika360_specialists_owner",
    email: "specialists-owner@example.test",
    name: "Demo Specialists Owner",
  },
];

const memberships = [
  {
    id: "membership_demo_klinika360_owner",
    tenantId: primaryTenantId,
    userId: demoOwnerUserId,
    role: "OWNER",
  },
  {
    id: "membership_demo_klinika360_admin",
    tenantId: primaryTenantId,
    userId: "user_demo_klinika360_admin",
    role: "ADMIN",
  },
  {
    id: "membership_demo_klinika360_doctor",
    tenantId: primaryTenantId,
    userId: "user_demo_klinika360_doctor",
    role: "DOCTOR",
  },
  {
    id: "membership_demo_klinika360_receptionist",
    tenantId: primaryTenantId,
    userId: "user_demo_klinika360_receptionist",
    role: "RECEPTIONIST",
  },
  {
    id: "membership_demo_klinika360_manager",
    tenantId: primaryTenantId,
    userId: "user_demo_klinika360_manager",
    role: "MANAGER",
  },
  {
    id: "membership_demo_klinika360_staff",
    tenantId: primaryTenantId,
    userId: "user_demo_klinika360_staff",
    role: "STAFF",
  },
  {
    id: "membership_demo_klinika360_specialists_owner",
    tenantId: specialistsTenantId,
    userId: "user_demo_klinika360_specialists_owner",
    role: "OWNER",
  },
  {
    id: "membership_demo_klinika360_specialists_manager",
    tenantId: specialistsTenantId,
    userId: demoOwnerUserId,
    role: "MANAGER",
  },
];

const patients = [
  {
    id: "pat_demo_seed_001",
    firstName: "Demo",
    lastName: "Patient One",
    email: "patient-one@example.test",
    phone: "+1555010101",
    lastVisitAt: new Date("2025-09-03T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-03-03T00:00:00.000Z"),
    preferredRecallChannel: "PHONE",
    acceptsEmail: true,
    acceptsSms: false,
  },
  {
    id: "pat_demo_seed_002",
    firstName: "Demo",
    lastName: "Patient Two",
    email: "patient-two@example.test",
    phone: "+1555010102",
    lastVisitAt: new Date("2025-11-18T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-05-18T00:00:00.000Z"),
    preferredRecallChannel: "SMS",
    acceptsEmail: true,
    acceptsSms: true,
  },
  {
    id: "pat_demo_seed_003",
    firstName: "Demo",
    lastName: "Patient Three",
    email: "patient-three@example.test",
    phone: "+1555010103",
    lastVisitAt: new Date("2025-12-09T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-06-09T00:00:00.000Z"),
    preferredRecallChannel: "EMAIL",
    acceptsEmail: true,
    acceptsSms: false,
  },
  {
    id: "pat_demo_seed_004",
    firstName: "Demo",
    lastName: "Patient Four",
    email: "patient-four@example.test",
    phone: "+1555010104",
    lastVisitAt: new Date("2024-12-15T00:00:00.000Z"),
    nextRecallDueAt: new Date("2025-06-15T00:00:00.000Z"),
    preferredRecallChannel: "EMAIL",
    acceptsEmail: true,
    acceptsSms: false,
  },
  {
    id: "pat_demo_seed_005",
    firstName: "Demo",
    lastName: "Patient Five",
    email: null,
    phone: "+1555010105",
    lastVisitAt: new Date("2026-01-10T00:00:00.000Z"),
    nextRecallDueAt: new Date("2026-07-10T00:00:00.000Z"),
    preferredRecallChannel: "PHONE",
    acceptsEmail: false,
    acceptsSms: false,
  },
];

const appointments = [
  {
    id: "appt_demo_seed_001",
    patientId: "pat_demo_seed_002",
    startsAt: new Date("2026-05-22T14:00:00.000Z"),
    endsAt: new Date("2026-05-22T14:30:00.000Z"),
    status: "CONFIRMED",
  },
  {
    id: "appt_demo_seed_002",
    patientId: "pat_demo_seed_003",
    startsAt: new Date("2026-05-23T09:00:00.000Z"),
    endsAt: new Date("2026-05-23T09:30:00.000Z"),
    status: "SCHEDULED",
  },
  {
    id: "appt_demo_seed_003",
    patientId: "pat_demo_seed_004",
    startsAt: new Date("2026-04-14T11:00:00.000Z"),
    endsAt: new Date("2026-04-14T11:30:00.000Z"),
    status: "NO_SHOW",
  },
];

const recallCampaigns = [
  {
    id: "campaign_demo_seed_001",
    patientId: null,
    name: "May hygiene recall",
    status: "DRAFT",
    startsAt: new Date("2026-05-20T00:00:00.000Z"),
  },
  {
    id: "campaign_demo_seed_002",
    patientId: "pat_demo_seed_004",
    name: "Dormant patient reactivation",
    status: "ACTIVE",
    startsAt: new Date("2026-05-01T00:00:00.000Z"),
  },
];

const notificationMessages = [
  {
    id: "message_demo_seed_001",
    patientId: "pat_demo_seed_001",
    appointmentId: null,
    recallCampaignId: "campaign_demo_seed_001",
    channel: "PHONE",
    status: "DRAFT",
    subject: null,
    bodyPreview: "Manual phone follow-up prepared for recall scheduling.",
    scheduledFor: null,
  },
  {
    id: "message_demo_seed_002",
    patientId: "pat_demo_seed_002",
    appointmentId: "appt_demo_seed_001",
    recallCampaignId: null,
    channel: "EMAIL",
    status: "QUEUED",
    subject: "Appointment reminder",
    bodyPreview: "Synthetic appointment reminder preview for local development.",
    scheduledFor: new Date("2026-05-21T09:00:00.000Z"),
  },
  {
    id: "message_demo_seed_003",
    patientId: "pat_demo_seed_004",
    appointmentId: null,
    recallCampaignId: "campaign_demo_seed_002",
    channel: "SMS",
    status: "FAILED",
    subject: null,
    bodyPreview: "Synthetic recall follow-up preview for local development.",
    scheduledFor: new Date("2026-05-02T09:00:00.000Z"),
  },
];

async function main() {
  await seedTenants();
  await seedUsers();
  await seedMemberships();
  await seedPatients();
  await seedAppointments();
  await seedRecallCampaigns();
  await seedNotifications();
  await seedImportBatches();
  await seedInvitations();
  await seedAuditLog();

  console.log(
    [
      "Seeded local demo database.",
      `tenants=${tenants.length}`,
      `users=${users.length}`,
      `memberships=${memberships.length}`,
      `patients=${patients.length}`,
      `appointments=${appointments.length}`,
      `campaigns=${recallCampaigns.length}`,
      `messages=${notificationMessages.length}`,
      "invitations=1",
    ].join(" "),
  );
}

async function seedTenants() {
  for (const tenant of tenants) {
    await prisma.tenant.upsert({
      where: { id: tenant.id },
      update: {
        name: tenant.name,
        slug: tenant.slug,
      },
      create: tenant,
    });
  }
}

async function seedUsers() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
      },
      create: user,
    });
  }
}

async function seedMemberships() {
  for (const membership of memberships) {
    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: membership.tenantId,
          userId: membership.userId,
        },
      },
      update: {
        role: membership.role,
        deactivatedAt: null,
      },
      create: membership,
    });
  }
}

async function seedPatients() {
  for (const patient of patients) {
    const { id, ...patientData } = patient;

    await prisma.patient.upsert({
      where: { id },
      update: {
        ...patientData,
        tenantId: primaryTenantId,
        isActive: true,
      },
      create: {
        id,
        ...patientData,
        tenantId: primaryTenantId,
        isActive: true,
      },
    });
  }
}

async function seedAppointments() {
  for (const appointment of appointments) {
    const { id, ...appointmentData } = appointment;

    await prisma.appointment.upsert({
      where: { id },
      update: {
        ...appointmentData,
        tenantId: primaryTenantId,
      },
      create: {
        id,
        ...appointmentData,
        tenantId: primaryTenantId,
      },
    });
  }
}

async function seedRecallCampaigns() {
  for (const campaign of recallCampaigns) {
    const { id, ...campaignData } = campaign;

    await prisma.recallCampaign.upsert({
      where: { id },
      update: {
        ...campaignData,
        tenantId: primaryTenantId,
      },
      create: {
        id,
        ...campaignData,
        tenantId: primaryTenantId,
      },
    });
  }
}

async function seedNotifications() {
  for (const message of notificationMessages) {
    const { id, ...messageData } = message;

    await prisma.notificationMessage.upsert({
      where: { id },
      update: {
        ...messageData,
        tenantId: primaryTenantId,
        recipientHash: hashSeedValue(id),
      },
      create: {
        id,
        ...messageData,
        tenantId: primaryTenantId,
        recipientHash: hashSeedValue(id),
      },
    });
  }
}

async function seedImportBatches() {
  const batches = [
    {
      id: "import_batch_demo_seed_001",
      tenantId: primaryTenantId,
      createdByUserId: demoOwnerUserId,
      status: "VALIDATED",
      source: "demo_csv",
      rowCount: 5,
      validRowCount: 5,
      invalidRowCount: 0,
    },
    {
      id: "import_batch_demo_seed_002",
      tenantId: specialistsTenantId,
      createdByUserId: demoOwnerUserId,
      status: "DRAFT",
      source: "demo_csv",
      rowCount: 0,
      validRowCount: 0,
      invalidRowCount: 0,
    },
  ];

  for (const batch of batches) {
    const { id, ...batchData } = batch;

    await prisma.patientImportBatch.upsert({
      where: { id },
      update: batchData,
      create: {
        id,
        ...batchData,
      },
    });
  }
}

async function seedInvitations() {
  await prisma.tenantInvitation.upsert({
    where: { id: "invitation_demo_seed_pending_receptionist" },
    update: {
      tenantId: primaryTenantId,
      email: "pending-invitee@example.test",
      role: "RECEPTIONIST",
      status: "PENDING",
      tokenHash: createSeedInvitationTokenHash(),
      invitedByUserId: demoOwnerUserId,
      acceptedByUserId: null,
      expiresAt: new Date("2026-06-30T00:00:00.000Z"),
      acceptedAt: null,
      revokedAt: null,
    },
    create: {
      id: "invitation_demo_seed_pending_receptionist",
      tenantId: primaryTenantId,
      email: "pending-invitee@example.test",
      role: "RECEPTIONIST",
      status: "PENDING",
      tokenHash: createSeedInvitationTokenHash(),
      invitedByUserId: demoOwnerUserId,
      expiresAt: new Date("2026-06-30T00:00:00.000Z"),
    },
  });
}

async function seedAuditLog() {
  await prisma.auditLog.upsert({
    where: { id: "audit_demo_seed_runtime_setup" },
    update: {
      tenantId: primaryTenantId,
      actorUserId: demoOwnerUserId,
      action: "demo.seed.completed",
      entityType: "Tenant",
      entityId: primaryTenantId,
      metadata: {
        tenants: tenants.length,
        users: users.length,
        memberships: memberships.length,
        patients: patients.length,
        appointments: appointments.length,
        campaigns: recallCampaigns.length,
        messages: notificationMessages.length,
        importBatches: 2,
        invitations: 1,
      },
    },
    create: {
      id: "audit_demo_seed_runtime_setup",
      tenantId: primaryTenantId,
      actorUserId: demoOwnerUserId,
      action: "demo.seed.completed",
      entityType: "Tenant",
      entityId: primaryTenantId,
      metadata: {
        tenants: tenants.length,
        users: users.length,
        memberships: memberships.length,
        patients: patients.length,
        appointments: appointments.length,
        campaigns: recallCampaigns.length,
        messages: notificationMessages.length,
        importBatches: 2,
        invitations: 1,
      },
    },
  });
}

function createSeedInvitationTokenHash() {
  return hashSeedValue(randomBytes(32).toString("hex"));
}

function hashSeedValue(value) {
  return createHash("sha256").update(value).digest("hex");
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
