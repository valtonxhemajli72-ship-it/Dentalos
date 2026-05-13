# ADR-003: Eventing, CDC, And Analytics

## Status

Planned

## Context

Klinika360 needs reliable operational events and eventually analytical reporting. The MVP does not need Kafka, Debezium, or ClickHouse yet.

## Decision

Use typed domain event interfaces now. Add an in-process event bus or outbox pattern when side effects grow. Add Debezium for PostgreSQL CDC and ClickHouse for OLAP only after reporting and scale justify them.

## Consequences

- Event names become consistent early.
- Product modules do not depend on event infrastructure.
- Analytics can be designed around privacy and retention before raw data flows outward.

## What Is Implemented Now

- `src/server/events` defines domain event names, event envelopes, publisher interface, and no-op publisher.
- Audit logging remains separate from broad analytics.

## What Is Intentionally Deferred

- Kafka or other broker.
- Debezium CDC.
- ClickHouse.
- Outbox relay.
- Analytical dashboards using production patient data.
