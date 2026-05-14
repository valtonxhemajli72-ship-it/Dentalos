# ADR-011: Backend Scalability Boundary

## Status

Accepted

## Context

Klinika360 is a multi-tenant SaaS product for dental clinics. The expected near-term scale is about 300 clinics with doctors, receptionists, managers, administrative staff, and other clinic team members using the system throughout an 8-hour clinic day.

Next.js is a good MVP web and BFF layer, but the product should not become "Next.js does everything forever." Patient imports, recall campaign preparation, notifications, reporting, tenant onboarding, tenant offboarding, and integration syncs can become long-running or high-volume work. Those responsibilities need explicit boundaries before they need separate infrastructure.

## Decision

- Next.js remains the web/BFF layer for now.
- Business logic must stay in modules and services under `src/modules`, not buried in UI components.
- Tenant-owned database access must stay in tenant-scoped repositories with obvious function names and required tenant context.
- Heavy or long-running work must be moved to worker services as soon as it appears.
- Jobs, events, workflows, observability, policy, feature flags, metering, and integration concerns must go through internal interfaces under `src/server`.
- A dedicated backend API is planned but deferred until complexity, scale, client diversity, deployment needs, or team ownership justifies it.
- NestJS, Fastify, Go, Redis, queues, and worker infrastructure are not added by this ADR.

## Consequences

- The MVP remains easy to run and review.
- Future extraction has stable seams: modules, repositories, jobs, events, workflows, and server interfaces.
- Security review can focus on tenant context, permissions, PII, idempotency, and observability at each boundary.
- Server actions stay thin and should not accumulate long-running business workflows.
- Some future features will require interface-first work before infrastructure is introduced.

## Current Implementation

- Next.js App Router handles dashboard routes, server actions, and API route handlers.
- Auth and tenant resolution live under `src/server/auth`.
- Domain logic lives under `src/modules`.
- Tenant helpers enforce scoped data access patterns in `src/modules/tenants`.
- Prisma access is concentrated in repository functions for tenant-owned data.
- `src/server/workflows`, `src/server/events`, `src/server/jobs`, and `src/server/observability` provide dependency-free boundaries today.
- No queue, worker process, Redis, Temporal, dedicated API service, or separate backend framework is installed.

## Deferred Implementation

- Worker process for imports, campaigns, notifications, reports, tenant onboarding, tenant offboarding, and integration syncs.
- Queue abstraction and durable queue provider.
- Redis for rate limits, cache, short-lived locks, or queue backend needs.
- PgBouncer or equivalent connection pooling when connection pressure grows.
- Dedicated API backend if Next.js BFF boundaries are no longer enough.
- NestJS, Fastify, or Go backend only after a follow-up ADR selects a runtime and migration plan.
- API gateway, load balancing, WAF, container orchestration, and enterprise observability after deployment architecture is explicitly in scope.

## Exit Criteria For A Dedicated Backend

Consider a dedicated backend when at least one is true:

- Multiple clients need stable API contracts beyond the Next.js dashboard.
- Server actions and route handlers become difficult to review despite module boundaries.
- Backend deployment or autoscaling needs diverge from the web UI.
- Workers and integrations need a shared backend API that should not be owned by Next.js.
- Throughput, latency, or connection pressure requires independent scaling.
- Team ownership separates web product and backend platform responsibilities.

## Exit Criteria For Workers And Queue

Add workers and queue infrastructure when work:

- Continues after the user leaves the page.
- Needs retries, backoff, dead-letter handling, delayed execution, or concurrency limits.
- Processes large imports, campaigns, notifications, reports, onboarding, offboarding, or integration batches.
- Needs progress tracking, cancellation, or recovery after failure.
- Threatens request latency, provider rate limits, or PostgreSQL connection budgets.

## Tenant Safety During Extraction

Extraction must preserve:

- Required tenant context on every tenant-owned operation.
- Tenant-scoped repository access and tenant-aware indexes.
- Membership and permission validation before private tenant data access.
- Job, event, workflow, metric, and audit payloads that include tenant context but no PII.
- Idempotency keys for retryable background work.
- No raw CSV, patient names, emails, phones, notes, message bodies, tokens, secrets, or provider payloads in queues, logs, metrics, audit metadata, or traces.
- Explicit authorization and audit logs for cross-tenant admin workflows.
