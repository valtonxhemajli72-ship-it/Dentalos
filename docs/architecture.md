# Klinika360 Architecture

Klinika360 starts as a modular monolith inside the DentalOS repository: one deployable application with clear internal boundaries. This keeps delivery fast while preserving the option to split infrastructure later if scale or team shape requires it.

## Core Modules

- `tenants` - clinic accounts, memberships, permissions, and tenant resolution.
- `patients` - patient records, lifecycle status, recall metadata, and contact preferences.
- `patient-import` - CSV parsing, validation, masked preview, and patient draft mapping.
- `appointments` - bookings, cancellations, no-show tracking, and reminder eligibility.
- `notifications` - message drafts, delivery state, templates, and providers.
- `billing` - future invoices, payments, plans, and account status.
- `ai` - prompt registry, orchestration, output validation, and audit.

## Multi-Tenancy Model

DentalOS MVP uses a shared application and shared PostgreSQL database. Tenant-owned data must include `tenantId`. Requests resolve the authenticated user and active tenant before domain logic or database access. Client-supplied tenant IDs are hints only; server-side membership and permission checks decide access.

No fetch, update, delete, list, import, export, event, or job operation for tenant-owned data should run without tenant context. Repository functions should use names such as `getPatientForTenant(tenantId, patientId)` instead of unscoped names such as `getPatient(id)`.

Background jobs and event handlers carry tenant context explicitly so asynchronous work follows the same isolation rules as request-response flows.

Tenant isolation helpers live in `src/modules/tenants`. Use `requireTenantId`, `createTenantScopedWhere`, `assertTenantScopedQuery`, and `assertTenantOwnedData` to make scope reviewable in code.

## Local Database Runtime

Local development uses Docker Compose PostgreSQL, Prisma migrations, and a deterministic fake seed dataset. The seeded data mirrors the development auth contract so private dashboard routes can resolve a real `User`, `Membership`, and `Tenant` when `DEMO_AUTH_ENABLED="true"`.

```text
docker compose up -d
  -> PostgreSQL klinika360_dev
  -> npm run db:migrate
  -> npm run db:seed
  -> npm run dev
```

The seed creates tenant-owned records with explicit `tenantId`, stores only invitation token hashes, and writes audit metadata with counts and IDs only. This runtime is for local development and demo validation; staging and production database provisioning, backups, PITR, and connection pooling remain separate operational work.

## Request Flow

```text
Request -> Auth -> Tenant resolution -> Permission check -> Validation -> Domain logic -> Database -> Events/Jobs -> Audit -> Response
```

Each step should be explicit in code once that layer exists. Missing context should fail closed.

NextAuth provides the first real authentication provider boundary through Google OAuth. OAuth sessions map by email to an existing `User`, then resolve `Membership` and `Tenant` before private routes can access tenant data. Development auth provides a deterministic local Klinika360 tenant only outside production and only when `DEMO_AUTH_ENABLED="true"`. Production ignores demo auth and fails closed when provider configuration, session, user, or membership context is missing. The auth boundary exposes `getCurrentUser`, `requireCurrentUser`, `getCurrentTenantContext`, `requireTenantContext`, `requireMembership`, `requireRole`, and `requirePermission`; product routes and server actions should use those helpers instead of reading sessions directly.

RBAC permissions live in `src/server/auth/permissions.ts`. Patient list pages require `patient:read`, patient import pages and actions require `patient:import`, recall pages require `recall:read`, and campaign preparation placeholders check `campaign:prepare`.

Tenant switching stores the selected tenant ID in an HTTP-only cookie. The selected value is never trusted by itself; `resolveActiveTenantForUser` revalidates it against the authenticated user’s active memberships and falls back to the first valid membership when needed. Team management and staff invitations live in the tenants module. Invitation records store `tokenHash` only and do not send email yet.

Invitation acceptance lives at `/invitations/accept`. The page requires authentication before validating the invitation token. The server action hashes the raw token, validates the invitation record, enforces invited-email match, derives tenant and role from the invitation, creates or reactivates the membership, marks the invitation accepted, switches the active tenant to the accepted tenant, and records safe audit events. Raw tokens are never persisted or logged, and `tokenHash` is never returned to the client.

## Backend Boundary

Next.js is the current web and BFF layer. It renders dashboard screens, resolves auth and tenant context, validates request input, checks permissions, calls domain modules, and returns safe UI states. It should not become the permanent owner of every backend responsibility.

```text
Browser
  -> Next.js App Router pages, route handlers, and server actions
  -> auth, tenant, and permission helpers in src/server/auth
  -> domain services in src/modules
  -> tenant-scoped repositories
  -> Prisma and PostgreSQL

Domain services
  -> jobs, events, workflows, audit, policy, metering, and observability interfaces in src/server
  -> worker process and queue later when work becomes durable or long-running
```

Business rules should live in `src/modules`. Database access for tenant-owned data should live in tenant-scoped repositories. Future delivery providers, queues, workers, metrics, feature flags, policy engines, and workflow systems should enter through `src/server` interfaces before product modules depend on them.

## Request Lifecycle

```text
Request
  -> route/page/server action
  -> authenticate user
  -> resolve active tenant from membership
  -> require permission
  -> validate input
  -> call domain service
  -> use tenant-scoped repository
  -> publish safe events or enqueue jobs when needed
  -> write safe audit metadata
  -> return response
```

Server actions are acceptable for small request-bound mutations. They should stay thin: resolve context, authorize, validate, call domain services, and return safe states. Large imports, campaign processing, notifications, report generation, provider retries, tenant onboarding, tenant offboarding, and integration syncs should move to workers once they stop being quick request-bound operations.

## Worker And Job Lifecycle

```text
Server action or scheduled trigger
  -> create tenant-aware job or workflow input
  -> include idempotency key and safe metadata
  -> enqueue through src/server/jobs or start workflow through src/server/workflows
  -> worker loads tenant context by ID
  -> worker calls domain service and tenant-scoped repositories
  -> worker records no-PII metrics, events, and audit logs
  -> worker retries or dead-letters according to queue policy
```

Job, event, and workflow payloads must carry tenant context explicitly and must not include raw CSV, patient names, emails, phones, notes, message bodies, provider payloads, tokens, or secrets.

## What Belongs Where

- `src/app`: routing, server actions, route handlers, page composition, form handling, and safe UI states.
- `src/components`: reusable presentation and interaction components.
- `src/modules`: domain rules, workflow-specific application logic, validation helpers, and repository-facing services.
- `src/modules/*/repository.ts`: tenant-scoped data access for module-owned persistence.
- `src/server/auth`: authentication, membership resolution, tenant context, and RBAC helpers.
- `src/server/jobs`: job enqueueing boundary for future worker-backed work.
- `src/server/events`: domain event boundary and future outbox or broker integration.
- `src/server/workflows`: durable workflow boundary for future Temporal-style orchestration.
- `src/server/observability`: metrics and instrumentation boundaries with no PII.
- `src/server/db`: database client creation and infrastructure-level database concerns.

## Backend Anti-Patterns

- Direct Prisma access in React components or page components.
- Business logic buried inside page components instead of domain modules.
- Long-running jobs inside server actions.
- Tenant-owned queries without `tenantId`.
- Repository functions shaped like `getPatient(id)` for tenant-owned data.
- Logs, metric labels, events, job payloads, workflow payloads, or audit metadata containing PII or secrets.
- Provider SDK calls scattered through product modules.
- Adding Redis, queues, workers, or a dedicated backend before an ADR-backed need exists.

## Event Examples

- `patient.created`
- `appointment.booked`
- `appointment.cancelled`
- `invoice.issued`
- `payment.received`
- `recall.campaign.started`
- `reminder.sent`

## Async Strategy

Start simple:

- Simple jobs run through a small server-side job abstraction.
- Domain events are published through an in-process event bus.
- External delivery adapters stay behind module boundaries.
- Patient import stores import batch counts and status only; raw CSV content and unnecessary PII are not stored in import metadata.
- Patient import persistence writes patients, optional appointments, import batch counts, and safe audit events in a tenant-scoped transaction.

Later:

- Move queued work to a durable queue when delivery reliability requires it.
- Use Temporal or a similar workflow engine for long-running, stateful workflows such as multi-step recall campaigns, reactivation sequences, and billing lifecycle automation.

## AI Strategy

AI belongs in an orchestration module, not scattered through product code.

- Maintain a prompt registry.
- Validate inputs and outputs.
- Audit AI-assisted actions.
- Require human review for sensitive messages or operational actions.
- Treat AI suggestions as drafts. The system validates and the user approves.

Do not send patient PII to AI providers until the product has an explicit privacy, compliance, and vendor policy.

## Enterprise Baseline

- Safe security headers are configured in `next.config.mjs`; CSP starts in report-only mode to avoid breaking development.
- GitHub CI, CodeQL, Semgrep, secret scanning, and Dependabot are configured as repository baselines.
- Accessibility target is WCAG 2.2 AA.
- Performance target is Core Web Vitals and fast operational dashboard navigation.

## Platform Interfaces

Advanced enterprise services are planned behind internal interfaces:

- `src/server/workflows` for future Temporal-backed workflows.
- `src/server/events` for domain event publishing and future outbox, broker, or CDC integration.
- `src/server/policy` for future OPA-backed policy decisions.
- `src/server/feature-flags` for future Unleash-backed rollout controls.
- `src/server/metering` for future OpenMeter-backed usage events.
- `src/server/observability` for future Prometheus, Grafana, and OpenTelemetry instrumentation.

These interfaces are dependency-free and no-op or local today. Product modules should depend on these boundaries, not on vendor SDKs.
