import { assertNoPIIInAuditMetadata } from "@/lib/privacy";

export type DomainEventName =
  | "patient.created"
  | "patient_import.imported"
  | "patient_import.failed"
  | "appointment.booked"
  | "appointment.cancelled"
  | "invoice.issued"
  | "payment.received"
  | "recall_campaign.prepared"
  | "recall.campaign.started"
  | "reminder.sent"
  | "tenant.onboarded"
  | "tenant.offboarding_requested";

export type DomainEventMetadataValue = string | number | boolean | null | undefined;
export type DomainEventMetadata = Record<string, DomainEventMetadataValue>;

export type DomainEvent<TMetadata extends DomainEventMetadata = DomainEventMetadata> = {
  name: DomainEventName;
  tenantId: string;
  actorUserId?: string;
  entityId?: string;
  occurredAt: Date;
  metadata?: TMetadata;
};

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

export function createDomainEvent(input: Omit<DomainEvent, "occurredAt">): DomainEvent {
  if (!input.tenantId) {
    throw new Error("Domain events require tenantId.");
  }

  assertNoPIIInAuditMetadata(input.metadata);

  return {
    ...input,
    occurredAt: new Date(),
  };
}

export function createNoopEventPublisher(): EventPublisher {
  return {
    async publish() {
      return undefined;
    },
    async publishMany() {
      return undefined;
    },
  };
}

export const eventingRoadmapNote =
  "EventBridge, Kafka, Debezium, or an outbox relay may implement EventPublisher later; product modules should not call those systems directly.";
