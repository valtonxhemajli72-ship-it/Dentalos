# Klinika360 Worker And Queue Interface

DentalOS remains a modular monolith today. This interface defines how future background work should enter the system without adding Redis, SQS, EventBridge, Temporal, BullMQ, Kafka, or a deployed worker runtime yet.

The current implementation is a dependency-free boundary only. Existing patient import and recall campaign workflows still run synchronously inside guarded server actions and tenant-scoped repositories. No real queueing, retry worker, provider dispatch, SMS, email, WhatsApp, payment, or AI call is implemented.

## Why Workers And Queues Are Needed

Some work should not stay inside the HTTP request lifecycle once product usage grows:

- Patient import processing for larger CSVs.
- Recall campaign audience validation and preparation.
- Notification batch preparation and future provider dispatch.
- Report generation and exports.
- Tenant onboarding, offboarding, and integration syncs.

These workloads need idempotency, retries, dead-letter handling, progress visibility, tenant-level serialization, and no-PII operational signals. Server actions should resolve auth, tenant context, permission, and input validation, then call domain logic or enqueue a reviewed job when the work becomes long-running.

## Current State

- `src/server/jobs` defines job names, payload types, queue client contracts, safety helpers, and registry metadata.
- `createNoopQueueClient()` validates job envelopes and returns a deferred result without doing work.
- `createInlineDevelopmentQueueClient()` exists only for explicit local handler experiments and is disabled by default in production.
- No product workflow enqueues real jobs yet.
- No provider adapter is called from the jobs boundary.

## Known Job Names

| Job name                            | Purpose today                                             | Future worker                                                                    |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `patient_import.process`            | Boundary for persisted import batch processing.           | Process large imports with tenant-scoped duplicate checks and idempotent writes. |
| `recall_campaign.prepare`           | Boundary for no-send campaign preparation after approval. | Prepare notification records after approval without delivery side effects.       |
| `recall_campaign.validate_audience` | Boundary for larger audience validation.                  | Re-check candidate eligibility through tenant-scoped repositories.               |
| `notification.prepare_batch`        | Boundary for delivery-ready notification records.         | Build provider-neutral notification batches with no message bodies in logs.      |
| `notification.dispatch_placeholder` | Placeholder only.                                         | Requires separate reviewed provider adapter before real dispatch.                |
| `report.generate_placeholder`       | Boundary for tenant operational reports.                  | Generate reports after retention and export policy are defined.                  |

## Payload Safety Rules

Every job that touches tenant-owned data must include:

- `tenantId`.
- `idempotencyKey`.
- `actorUserId` when the action came from a user.
- Stable IDs such as `campaignId`, `importBatchId`, `notificationBatchId`, or `reportId` only when needed.
- Counts, statuses, channels, flags, and correlation IDs when useful for operations.

Queue payloads and metadata must not contain patient names, emails, phones, notes, raw CSV, message bodies, invitation tokens, token hashes, auth tokens, cookies, secrets, sessions, provider payloads, or request bodies.

## Idempotency Strategy

Each job payload requires an idempotency key. Keys should be built from stable non-PII parts such as job name, tenant ID, entity ID, and operation version. Future workers should enforce idempotency at the durable store boundary before mutating tenant-owned records.

Examples:

- `patient_import.process:{tenantId}:{importBatchId}:v1`
- `recall_campaign.prepare:{tenantId}:{campaignId}:approved:v1`
- `notification.prepare_batch:{tenantId}:{campaignId}:v1`

Retries must not duplicate patient creation, campaign status changes, notification records, reports, or audit events.

## Retry And Dead-Letter Strategy

The registry documents retry intent but does not execute retries today. Future durable queues should use:

- Bounded exponential backoff for transient database, provider, or rate-limit failures.
- No retry for validation, auth, permission, tenant mismatch, or malformed payload failures.
- Dead-letter records with job ID, tenant ID, safe reason code, attempt count, and timestamps only.
- Operator tooling that redacts payloads by default.

Dead-letter metadata must follow the same no-PII rules as audit and observability metadata.

## Observability

Job logs, metrics, and traces should use safe fields:

- job name
- job ID
- tenant ID when needed
- actor user ID when needed
- status
- attempt count
- duration
- counts
- non-sensitive reason codes

Do not log queue payloads directly. Use `redactJobPayloadForLogs()` for operational summaries and keep raw payload inspection out of logs.

## Future Runtime Mapping

The interface is intentionally provider-neutral:

- A local worker process can consume the registry and handlers first.
- PostgreSQL-backed coordination can be considered for very small workloads.
- SQS or a Redis-backed queue can implement `QueueClient` when retry and visibility requirements are clear.
- EventBridge can be used for event routing after outbox and delivery semantics are reviewed.
- Temporal remains a later workflow engine for durable multi-step processes, not the first queue.

Any runtime choice needs an ADR covering tenant isolation, connection pooling, retries, dead letters, observability, data residency, deployment, and rollback.

## PgBouncer And Database Pressure

Workers increase database connection pressure. Before production workers are enabled, validate Prisma pooling behavior, PgBouncer compatibility, tenant-scoped transactions, future RLS transaction-local tenant context, and safe shutdown behavior.

## Recall And Notification Boundary

Recall campaign approval still records readiness only. It does not enqueue, send, or call a provider. The future path is:

1. Approve a tenant-owned campaign through the current RBAC-guarded server action.
2. Enqueue `recall_campaign.prepare` with tenant ID, actor user ID, campaign ID, and idempotency key.
3. Worker revalidates the campaign and audience through tenant-scoped repositories.
4. Worker creates provider-neutral notification records.
5. A separately reviewed delivery adapter handles actual provider dispatch later.

Message bodies and patient contact details must never be copied into job metadata or logs.

## Validation

Run:

```bash
npm run jobs:validate
```

This check is static and dependency-free. It confirms the job interface files, registry, docs, package script, known job names, no obvious provider calls, and sensitive metadata guardrails.
