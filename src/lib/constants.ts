export const appName = "DentalOS";

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
