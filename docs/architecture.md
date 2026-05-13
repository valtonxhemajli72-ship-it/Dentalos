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

## Request Flow

```text
Request -> Auth -> Tenant resolution -> Permission check -> Validation -> Domain logic -> Database -> Events/Jobs -> Audit -> Response
```

Each step should be explicit in code once that layer exists. Missing context should fail closed.

Development auth provides a deterministic local Klinika360 tenant only outside production. Production must use real authentication and membership checks before private routes are usable.

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
