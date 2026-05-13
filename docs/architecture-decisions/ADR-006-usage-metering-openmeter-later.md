# ADR-006: Usage Metering And OpenMeter Later

## Status

Planned

## Context

Usage-based billing or tenant-tier limits may become valuable after pricing is validated. OpenMeter is a future candidate. Billing and payments are intentionally not part of the current MVP.

## Decision

Define a no-op usage meter interface now. Emit no external usage events. Introduce OpenMeter later only after product, billing, support, and privacy requirements are clear.

## Consequences

- Usage event shapes can be reviewed early.
- No billing dependency is introduced.
- Patient PII must not enter usage events.

## What Is Implemented Now

- `src/server/metering` defines usage events, usage meter interface, and no-op meter.

## What Is Intentionally Deferred

- OpenMeter.
- Payment processing.
- Billing provider integration.
- Usage-based invoicing.
- Tenant quota enforcement.
