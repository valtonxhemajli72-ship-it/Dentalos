# Klinika360

Klinika360 is a multi-tenant SaaS platform for dental clinics. DentalOS remains the internal repository codename. The long-term vision is a clinic operating system, starting with a focused wedge product for patient recall, appointment reminders, follow-up automation, no-show reduction, and patient reactivation.

The first version should help a clinic consistently bring patients back into care without adding more manual work to the front desk.

Klinika360 is designed for doctors, receptionists, clinic managers, administrative staff, and other clinic team members. Private dashboard flows use NextAuth/Auth.js-compatible authentication, tenant membership resolution, and RBAC checks. The deterministic demo identity is local-development only, requires explicit `DEMO_AUTH_ENABLED="true"`, and is ignored in production.

## Initial Wedge

- Recall campaigns for patients due or overdue for care.
- Appointment reminders that reduce avoidable no-shows.
- Post-visit follow-up workflows.
- Patient reactivation lists for dormant patients.
- Clinic activity views for operational follow-through.
- Tenant-scoped patient import persistence for recall onboarding.

## Long-Term Modules

- Patients
- Appointments
- Documents
- Billing
- Notifications
- Reports
- AI orchestration
- Integrations

## Enterprise Platform Roadmap

Klinika360 should grow into an enterprise-grade platform without installing heavy infrastructure before the product needs it. The repository now documents future platform services and exposes lightweight internal interfaces for them:

- Workflows: Temporal later, behind `src/server/workflows`.
- Eventing and analytics: outbox/EventBridge/Kafka, Debezium, and ClickHouse later, behind `src/server/events`.
- Policy: OPA later, behind `src/server/policy`.
- Feature flags: Unleash later, behind `src/server/feature-flags`.
- Usage metering: OpenMeter later, behind `src/server/metering`.
- Observability: Prometheus, Grafana, and OpenTelemetry later, behind `src/server/observability`.
- Runtime security and secrets: Falco, cert-manager, and External Secrets Operator later if Kubernetes becomes the deployment platform.

These services are planned, not installed. The current implementation is dependency-free and no-op/local by default.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prettier
- Prisma schema prepared for PostgreSQL
- npm for package management in this repository

## Local Development

Install dependencies:

```bash
npm install
```

Run the local PostgreSQL-backed app:

```bash
cp .env.example .env.local
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` for the copy step.

For a real first clinic in a controlled local or staging database, use the CLI-only admin bootstrap instead of demo seed data:

```bash
SETUP_BOOTSTRAP_SECRET="local-dev-secret" BOOTSTRAP_SECRET="local-dev-secret" BOOTSTRAP_TENANT_NAME="Klinika360 Demo Clinic" BOOTSTRAP_OWNER_EMAIL="owner@example.test" BOOTSTRAP_OWNER_NAME="Demo Owner" npm run bootstrap:admin
```

See `docs/admin-bootstrap.md` before using this outside a disposable local database.

Start only the development server:

```bash
npm run dev
```

Open `http://localhost:3000` or `http://localhost:3000/dashboard`.

See `docs/local-development.md` and `docs/database-runtime.md` for reset, troubleshooting, and database safety notes.

## Environment Variables

Copy `.env.example` to `.env.local` for local development and replace placeholders with local values only. Do not commit real secrets.

Required later for database-backed work:

- `DATABASE_URL`
- `DEMO_AUTH_ENABLED` for explicit local demo auth only
- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `SETUP_BOOTSTRAP_SECRET` for controlled one-off first clinic bootstrap only

Optional integration placeholders:

- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## Scripts

- `npm run dev` - start the Next.js dev server.
- `npm run build` - create a production build.
- `npm run lint` - run ESLint.
- `npm run typecheck` - generate Next.js route types and run TypeScript without emitting files.
- `npm run format` - format the repository with Prettier.
- `npm run format:check` - check formatting.
- `npm run auth:validate` - run dependency-free RBAC mapping checks.
- `npm run invitation:validate` - run dependency-free invitation acceptance guardrail checks.
- `npm run runtime:validate` - run dependency-free local runtime setup guardrail checks.
- `npm run bootstrap:admin` - run the guarded first clinic admin bootstrap CLI.
- `npm run bootstrap:validate` - run dependency-free admin bootstrap guardrail checks.
- `npm run tenant:validate` - run dependency-free tenant security guardrail checks.
- `npm run dev:db` - start the local PostgreSQL service with Docker Compose.
- `npm run db:migrate` - apply Prisma migrations to the configured database.
- `npm run db:generate` - generate Prisma Client.
- `npm run db:validate` - validate the Prisma schema.
- `npm run db:seed` - manually seed fake demo data after a database and schema are available.
- `npm run db:studio` - open Prisma Studio.
- `npm run db:reset` - reset the configured database; use only for local development.

## Architecture Overview

DentalOS is a modular monolith first. Product UI, application logic, domain modules, data access, events/jobs, and AI orchestration should remain separated even while they deploy as one application.

Next.js is the current web and BFF layer for the dashboard. Backend scalability is documented in `docs/backend-scalability-strategy.md`: future workers, queues, Redis, connection pooling, and a dedicated backend API are planned thresholds, not implemented infrastructure.

The MVP tenancy model is a shared app and shared PostgreSQL database. Every tenant-owned record must be modeled with `tenantId`, and every tenant-owned query must include tenant context. Private routes must require authentication and tenant resolution before data access. AI is an assistant layer that suggests drafts or actions; the system remains the source of truth.

Auth uses `next-auth` with Google OAuth as the first real provider path when `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET` are configured. OAuth sessions map by email to an existing `User`, then to `Membership`, then to tenant context. Development demo auth requires `DEMO_AUTH_ENABLED="true"` and is ignored in production. Permissions are defined in `src/server/auth/permissions.ts` and cover patients, recall, campaigns, notifications, settings, audit, users, and billing read access.

First clinic creation is intentionally CLI-only through `npm run bootstrap:admin`. It requires a matching setup secret, creates or reuses the tenant, owner user, `OWNER` membership, tenant setup state, and no-PII audit events, then should be disabled by removing or rotating the setup secret.

Tenant switching is backed by validated memberships. When a user has multiple memberships, the selected tenant is stored in an HTTP-only cookie and revalidated against the user’s memberships on every request. Team access management starts at `/dashboard/settings/team`; Owner/Admin users can create or revoke invitation records and update non-owner roles. No invitation email is sent yet, and only invitation token hashes are stored.

Invitation acceptance is available at `/invitations/accept?token=...`. The accepting user must authenticate with the invited email address; the server hashes and validates the token, derives tenant and role from the invitation record, creates or reuses a tenant membership safely, and records audit events without raw tokens, token hashes, or email addresses in metadata.

The current patient import workflow helps a clinic paste a CSV, validate rows, preview masked contact indicators, save valid tenant-scoped patient records when a database is configured, and prepare recall review. It creates a `PatientImportBatch` with counts only. It does not store raw CSV content and does not send email, SMS, WhatsApp, payment, or AI requests.

See:

- `docs/architecture.md`
- `docs/auth.md`
- `docs/admin-bootstrap.md`
- `docs/local-development.md`
- `docs/database-runtime.md`
- `docs/patient-import.md`
- `docs/product-strategy.md`
- `docs/recall-mvp.md`
- `docs/backend-scalability-strategy.md`
- `docs/backend-boundary-checklist.md`
- `docs/security.md`
- `docs/enterprise-readiness.md`
- `docs/security-checklist.md`
- `docs/agent-operating-model.md`
- `docs/platform-roadmap.md`
- `docs/architecture-decisions/`
- `docs/accessibility.md`
- `docs/performance.md`

## Agent Operating Model

Codex guardrail skills live under `.codex/skills`, with the recommended agent workflow documented in `docs/agent-operating-model.md`. These skills are documentation-only checklists for tenant isolation, auth/RBAC, Prisma safety, PII/audit review, accessibility, observability, dependency maintenance, custom domains, release readiness, and security diff review.

## Git Workflow

- Work on short-lived feature branches.
- Keep commits focused and reviewable.
- Do not commit `.env`, secrets, generated caches, local databases, or build output.
- Run lint, typecheck, build, and Prisma validation before opening a pull request when practical.

## Security Notes

- Never expose secrets in code, logs, screenshots, issues, or pull requests.
- Do not log patient PII.
- Do not store raw CSV content in import batches or audit metadata.
- Validate inputs at system boundaries.
- Fail safely when tenant, permission, or validation context is missing.
- Demo patient and recall fallbacks are local-development only and must be guarded by explicit demo auth.
- Treat healthcare and dental data with heightened privacy expectations.
- Target OWASP ASVS Level 2 as the application security baseline.
- Target WCAG 2.2 AA for accessibility and Core Web Vitals for performance.
- Do not paste real secrets or patient data into AI coding tools.

## CI And Repository Governance

The repository includes GitHub workflows for CI, CodeQL, Semgrep, and secret scanning, plus Dependabot configuration for npm and GitHub Actions. Pull requests should pass lint, typecheck, formatting, Prisma validation, build, and dependency audit checks before merge.

Governance files include `SECURITY.md`, `CODEOWNERS`, pull request templates, and issue templates. Security reports should use private channels and fake data only.

## MVP Roadmap

1. Add staff invitation email delivery behind a notification adapter.
2. Build patient import review history and duplicate resolution.
3. Create recall campaign draft and approval flows.
4. Add appointment reminder workflows.
5. Add notification delivery adapters behind safe interfaces.
6. Add audit logs and operational reporting.
7. Pilot with a small clinic and measure workflow completion, not medical outcomes.

## Tenant Isolation Roadmap

- MVP: shared schema, shared PostgreSQL database, and `tenantId` on tenant-owned rows.
- Next: PostgreSQL Row-Level Security.
- Later: schema-per-tenant for mid-market tenants if needed.
- Later: database-per-tenant for enterprise tenants if paid or contractually required.
- Later: PgBouncer or equivalent connection pooling as database concurrency grows.

## Intentionally Not Implemented Yet

- Staff invitation email delivery, tenant switching polish, and password auth.
- Real SMS, email, WhatsApp, or phone delivery integrations.
- Payment processing.
- Real OpenAI or other AI provider calls.
- Dedicated single-tenant deployments.
- Medical diagnosis or treatment recommendation features.
