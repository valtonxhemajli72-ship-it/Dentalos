# Klinika360 Backend Scalability Strategy

DentalOS starts as a modular monolith because Klinika360 needs fast product learning around recall, imports, reminders, and clinic operations. The target operating scale is about 300 clinics using the product continuously during an 8-hour clinic day. That is large enough to require clear backend boundaries early, but not large enough to justify a separate backend platform before the product proves the workflows.

This document defines how the current Next.js application should evolve without turning into "Next.js does everything forever."

## Why Next.js Is Acceptable Now

Next.js is a good MVP and BFF layer for the current product:

- It keeps authenticated dashboard pages, server actions, and route handlers close to the UI.
- It supports fast iteration for clinic workflows that are still being validated.
- It reduces operational surface area while the product is still a modular monolith.
- It can call domain modules, tenant-scoped repositories, and server interfaces without exposing those details to the browser.

The key constraint is that Next.js should orchestrate web requests, not become the permanent home for all backend behavior.

## Why Next.js Should Not Own Everything Forever

As usage grows, several responsibilities become poor fits for the request lifecycle:

- Large patient imports.
- Recall campaign generation and delivery preparation.
- Notification scheduling, retries, and provider callbacks.
- Report generation and exports.
- Tenant onboarding and offboarding workflows.
- Integration syncs.
- Operational metrics and alerting.

Those tasks need retries, idempotency, rate limits, locks, queue visibility, and safe background execution. Keeping them inside server actions would couple user page latency to backend work, make failures harder to recover, and increase database connection pressure.

## Current Architecture

Current implementation:

- Next.js App Router for web UI, dashboard routes, server actions, and API route handlers.
- NextAuth/Auth.js-compatible auth boundary under `src/server/auth`.
- Domain capabilities under `src/modules`.
- Tenant helpers under `src/modules/tenants`.
- Prisma access through repository functions that include tenant context.
- Dependency-free server interfaces under `src/server` for workflows, events, jobs, observability, policy, feature flags, metering, audit, and database access.
- PostgreSQL planned as the shared tenant database.
- No Redis, queue worker, dedicated API, Temporal, Kafka, ClickHouse, OPA, Unleash, OpenMeter, Prometheus, Grafana, SMS/email/WhatsApp delivery, payment, or real AI provider integration is installed.

## Target Architecture

Target shape:

```text
Browser
  -> Next.js web/BFF layer
  -> domain services in src/modules
  -> tenant-scoped repositories
  -> PostgreSQL through connection pooling

Domain services
  -> server interfaces in src/server
  -> jobs/events/workflows/observability adapters
  -> worker process and queue when needed

External integrations
  -> internal adapter interfaces first
  -> provider SDKs only behind reviewed server boundaries
```

The codebase should stay a modular monolith until scale, reliability, or team boundaries justify extraction. Extraction should follow existing interfaces, not bypass them.

## Boundary Responsibilities

| Boundary              | Responsibility                                                                                                                         | Must Avoid                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web/BFF layer         | Render pages, resolve auth and tenant context, authorize actions, validate request input, call domain services, return safe UI states. | Direct Prisma access in UI components, long-running work, provider SDK calls, hidden business rules.   |
| Domain services       | Enforce business rules for imports, recall, campaigns, notifications, staff operations, and reporting.                                 | Reading sessions directly, trusting client tenant IDs, logging PII, coupling to UI components.         |
| Repository/data layer | Perform tenant-scoped reads and writes through explicit repository functions.                                                          | Unscoped tenant queries, global lookup helpers for tenant-owned data, raw SQL without tenant review.   |
| Workers/jobs          | Run retryable, idempotent, longer-running work outside request lifecycle.                                                              | Patient PII in job metadata, missing tenant context, non-idempotent side effects.                      |
| Events                | Publish domain events with tenant context and safe metadata.                                                                           | Using events as debugging dumps, patient PII, secrets, or provider payloads.                           |
| Observability         | Record safe metrics, logs, traces, and operational signals.                                                                            | Patient names, emails, phones, notes, message bodies, raw CSV, tokens, or high-cardinality PII labels. |
| Future dedicated API  | Own stable backend contracts when scale or client diversity requires it.                                                               | Premature service split, duplicate auth logic, bypassed repository boundaries.                         |

## Server Actions

Server actions may:

- Resolve authenticated user and tenant context.
- Require permission before writes.
- Validate form input.
- Call domain modules and repositories.
- Persist small, bounded changes.
- Enqueue or request background work through `src/server/jobs` or `src/server/workflows`.
- Return safe success, validation, unauthorized, or error states.

Server actions should not permanently own:

- Large imports or expensive parsing beyond small MVP previews.
- Campaign generation across large patient cohorts.
- Notification delivery, retries, provider callbacks, or rate limiting.
- Report/export generation.
- Integration syncs.
- Any operation expected to outlive the HTTP request.
- Any operation needing retry policy, distributed locking, delayed execution, or queue visibility.

## When To Introduce Workers

Introduce a worker process when a feature needs one or more of these:

- Work continues after the user leaves the page.
- Work has provider retries or backoff.
- Work processes many patients, appointments, notifications, or imported rows.
- Work must be idempotent and resume after failure.
- Work needs progress tracking or operational visibility.
- Work risks exhausting request timeouts or database connections.

Likely first worker candidates are patient import persistence, recall campaign preparation, notification scheduling, report generation, tenant onboarding, and tenant offboarding.

## When To Introduce Redis

Redis should remain planned, not installed, until there is a concrete need for:

- Rate limiting for auth, invitations, imports, notifications, or provider callbacks.
- Short-lived cache for low-risk reference data.
- Distributed locks for job idempotency or tenant-level serialization.
- Queue backend support if the selected queue requires it.
- Session-adjacent coordination that cannot be safely handled in PostgreSQL.

Redis must not store raw patient PII, secrets, message bodies, raw CSV, or long-lived clinical data.

## When To Introduce Queues

Introduce a queue abstraction before choosing the final provider. Queue implementation becomes necessary when:

- Jobs need retries, delays, dead-letter handling, or concurrency controls.
- Notifications must be scheduled or rate-limited.
- Imports and campaign preparation need progress and recovery.
- Provider callbacks must be decoupled from domain updates.
- Workload bursts threaten request latency or database connection limits.

Likely candidates include SQS or a Redis-backed queue for early stages. Temporal remains later for durable stateful workflows, not the first queue.

## When To Introduce A Dedicated Backend API

Defer a dedicated API until at least one of these is true:

- Multiple clients need stable APIs beyond the Next.js dashboard.
- Server actions and route handlers become hard to reason about despite module boundaries.
- Backend deployment, scaling, or security review cadence needs to differ from the web UI.
- Workers and integrations need a shared API boundary that Next.js should not own.
- Throughput or latency pressure requires independent autoscaling.
- Team ownership splits between web product and backend platform.

Until then, Next.js remains the web/BFF layer and calls internal modules directly.

## When To Consider NestJS, Fastify, Or Go

Do not add NestJS, Fastify, Go, or a separate backend app by default.

Consider NestJS when the product needs a TypeScript service with strong module structure, dependency injection, OpenAPI contracts, guards, and background worker conventions.

Consider Fastify when a smaller TypeScript HTTP service is enough and low overhead matters.

Consider Go when operational services need high concurrency, small binaries, strict resource usage, or long-running worker throughput that TypeScript does not handle comfortably.

Any choice needs an ADR, migration plan, auth/tenant strategy, observability plan, and evidence that modular monolith boundaries are no longer enough.

## Database Scaling Plan

Stage the database path:

1. Shared PostgreSQL with tenant-owned rows and tenant-scoped repositories.
2. Add indexes for tenant-scoped reads, duplicate checks, due-date lists, status filters, and job scans.
3. Add PgBouncer or equivalent connection pooling when Next.js concurrency and worker processes increase connection pressure.
4. Add read replicas only for reporting or read-heavy workloads that can tolerate replication lag.
5. Add tenant consistency constraints and validate PostgreSQL Row-Level Security in staging.
6. Add PostgreSQL Row-Level Security for defense in depth after application-layer authorization remains intact.
7. Consider schema-per-tenant or database-per-tenant only for paid enterprise or contractual needs.

Build and typecheck must not require a live database.

## PgBouncer Plan

PgBouncer or equivalent pooling becomes important when:

- Serverless or autoscaled Next.js instances create too many database connections.
- Workers add steady background connection usage.
- Imports, campaigns, or reporting increase concurrent database work.
- RDS or the chosen PostgreSQL provider approaches safe connection limits.

When introduced, test Prisma compatibility, transaction behavior, prepared statement settings, RLS tenant context handling, and migration workflows before production use. Future RLS must set tenant context transaction-locally so pooled connections do not leak one tenant's setting into another request.

## Tenant Isolation Implications

Every extraction keeps the same tenant model:

- Tenant-owned data requires `tenantId`.
- Repository methods must make tenant scope explicit.
- Jobs, events, workflows, metrics, and audit records carry tenant context.
- Client-supplied tenant IDs are never trusted without membership and permission validation.
- Queue payloads must use IDs, counts, statuses, and flags only. Do not include raw CSV, patient names, emails, phones, notes, message bodies, or secrets.
- Cross-tenant admin workflows require explicit authorization and audit logging.

## Performance Risks

- Long-running server actions can tie up request workers and degrade dashboard latency.
- Direct Prisma access from UI components makes tenant isolation review harder.
- Unbounded list queries can become slow across 300 clinics.
- Missing tenant-scoped indexes can turn routine filters into table scans.
- Notification bursts can overwhelm providers and the database without queueing and rate limits.
- Report generation inside requests can exceed timeouts and connection budgets.
- High-cardinality metric labels can make observability expensive and risky.

## Operational Risks

- No worker means failed background work may be hard to retry.
- No queue means bursts can hit the database and providers directly.
- No connection pool means autoscaling can exhaust PostgreSQL connections.
- No structured no-PII observability means incidents are slower to debug.
- Premature service extraction creates deployment and security complexity before the product needs it.
- Provider integrations without internal adapters make future migration and review harder.

## Migration Path

1. Keep Next.js as the BFF and preserve module/repository boundaries.
2. Move business rules out of page components and into `src/modules`.
3. Route tenant-owned persistence through tenant-scoped repositories.
4. Add job and workflow interfaces for work that could become long-running.
5. Add a worker process when imports, campaigns, notifications, reports, onboarding, or offboarding need retries and progress tracking.
6. Add Redis or queue infrastructure only after the queue abstraction and workload requirements are clear.
7. Add PgBouncer when connection pressure is observed or expected from autoscaling and workers.
8. Extract a dedicated backend API only after API contracts, scaling needs, or team boundaries justify it.
9. Keep all extracted services tenant-safe, observable without PII, and reviewed through ADRs.
