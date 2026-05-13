export type NotificationChannel = "email" | "sms" | "phone";

export type NotificationDeliveryState =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled";

export type NotificationDraft = {
  tenantId: string;
  patientId?: string;
  channel: NotificationChannel;
  bodyPreview: string;
};
