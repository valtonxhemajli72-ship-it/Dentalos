export type DomainEventName =
  | "patient.created"
  | "appointment.booked"
  | "appointment.cancelled"
  | "invoice.issued"
  | "payment.received"
  | "recall.campaign.started"
  | "reminder.sent";

export type DomainEvent = {
  name: DomainEventName;
  tenantId: string;
  actorUserId?: string;
  entityId?: string;
  occurredAt: Date;
};

export function createDomainEvent(input: Omit<DomainEvent, "occurredAt">): DomainEvent {
  return {
    ...input,
    occurredAt: new Date(),
  };
}
