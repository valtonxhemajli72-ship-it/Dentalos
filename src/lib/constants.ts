export const APP_NAME = "Klinika360";
export const DEMO_TENANT_NAME = "Klinika360";
export const INTERNAL_PROJECT_NAME = "DentalOS";
export const APP_DESCRIPTION =
  "An enterprise-ready multi-tenant SaaS platform for dental clinic recall, reminders, follow-up, and patient reactivation workflows.";

export const appName = APP_NAME;

export const enterpriseUserRoles = [
  {
    role: "Doctors",
    description: "Review patient care context, recall readiness, and follow-up queues.",
  },
  {
    role: "Receptionists",
    description: "Manage patient imports, recall calls, reminder preparation, and scheduling work.",
  },
  {
    role: "Clinic managers",
    description: "Monitor no-shows, recall readiness, import status, and clinic activity.",
  },
  {
    role: "Administrative staff",
    description: "Work from role-appropriate operational lists with tenant-scoped access.",
  },
] as const;

export const wedgeCapabilities = [
  {
    title: "No-show reduction",
    description:
      "Surface unconfirmed appointments and support reminder workflows before chair time is lost.",
  },
  {
    title: "Recall campaigns",
    description:
      "Organize patients who are due or overdue for care into practical follow-up segments.",
  },
  {
    title: "Appointment reminders",
    description:
      "Prepare email, SMS, and phone reminder workflows behind provider-neutral boundaries.",
  },
  {
    title: "Patient reactivation",
    description: "Help clinics identify dormant patients and manage respectful outreach queues.",
  },
] as const;

export const futureModules = [
  "Patients",
  "Appointments",
  "Documents",
  "Billing",
  "Notifications",
  "Reports",
  "AI orchestration",
  "Integrations",
] as const;
