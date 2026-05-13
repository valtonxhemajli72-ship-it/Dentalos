# ADR-002: Workflows And Temporal Later

## Status

Accepted

## Context

Recall campaigns, tenant onboarding, tenant offboarding, data export, deletion/anonymization, and integration syncs may become long-running workflows. Temporal is a good future fit, but installing it now would add operational complexity before the MVP needs it.

## Decision

Define a dependency-free workflow client interface now. Keep the default implementation no-op. Introduce Temporal later behind this interface when workflows become durable, retryable, and stateful.

## Consequences

- Product modules avoid direct Temporal calls.
- The MVP can build and run without workflow infrastructure.
- Future durable workflows have a clear integration point.

## What Is Implemented Now

- `src/server/workflows` defines workflow names, start input, client interface, and no-op client.
- Short local jobs can remain simple and tenant-aware.

## What Is Intentionally Deferred

- Temporal server, workers, queues, schedules, retry policies, and workflow histories.
- Kubernetes deployment manifests for workflow workers.
- Long-running campaign or offboarding automation.
