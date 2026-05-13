export type AppointmentState = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type AppointmentSummary = {
  id: string;
  tenantId: string;
  patientId: string;
  startsAt: Date;
  state: AppointmentState;
};
