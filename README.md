# Klinika360

Klinika360 is a multi-tenant SaaS platform for dental clinics. DentalOS remains the internal repository codename. The long-term vision is a clinic operating system, starting with a focused wedge product for patient recall, appointment reminders, follow-up automation, no-show reduction, and patient reactivation.

The first version should help a clinic consistently bring patients back into care without adding more manual work to the front desk.

Klinika360 is designed for doctors, receptionists, clinic managers, administrative staff, and other clinic team members. Private dashboard flows now use an internal auth, tenant, membership, and RBAC boundary. The current demo identity is local-development only; production fails closed until a real auth provider is configured.

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

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` for local development and replace placeholders with local values only. Do not commit real secrets.

Required later for database-backed work:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

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
- `npm run db:validate` - validate the Prisma schema.
- `npm run db:seed` - manually seed fake demo data after a database and schema are available.

## Architecture Overview

DentalOS is a modular monolith first. Product UI, application logic, domain modules, data access, events/jobs, and AI orchestration should remain separated even while they deploy as one application.

The MVP tenancy model is a shared app and shared PostgreSQL database. Every tenant-owned record must be modeled with `tenantId`, and every tenant-owned query must include tenant context. Private routes must require authentication and tenant resolution before data access. AI is an assistant layer that suggests drafts or actions; the system remains the source of truth.

Auth currently uses a provider-neutral server boundary in `src/server/auth`. Development and test environments receive a deterministic Klinika360 demo user, tenant, membership, and `OWNER` role. Production receives no demo session and private dashboard routes render an access-required state instead of using a bypass. Permissions are defined in `src/server/auth/permissions.ts` and cover patients, recall, campaigns, notifications, settings, audit, users, and billing read access.

The current patient import workflow helps a clinic paste a CSV, validate rows, preview masked contact indicators, save valid tenant-scoped patient records when a database is configured, and prepare recall review. It creates a `PatientImportBatch` with counts only. It does not store raw CSV content and does not send email, SMS, WhatsApp, payment, or AI requests.

See:

- `docs/architecture.md`
- `docs/patient-import.md`
- `docs/product-strategy.md`
- `docs/recall-mvp.md`
- `docs/security.md`
- `docs/enterprise-readiness.md`
- `docs/security-checklist.md`
- `docs/platform-roadmap.md`
- `docs/architecture-decisions/`
- `docs/accessibility.md`
- `docs/performance.md`

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
- Treat healthcare and dental data with heightened privacy expectations.
- Target OWASP ASVS Level 2 as the application security baseline.
- Target WCAG 2.2 AA for accessibility and Core Web Vitals for performance.
- Do not paste real secrets or patient data into AI coding tools.

## CI And Repository Governance

The repository includes GitHub workflows for CI, CodeQL, Semgrep, and secret scanning, plus Dependabot configuration for npm and GitHub Actions. Pull requests should pass lint, typecheck, formatting, Prisma validation, build, and dependency audit checks before merge.

Governance files include `SECURITY.md`, `CODEOWNERS`, pull request templates, and issue templates. Security reports should use private channels and fake data only.

## MVP Roadmap

1. Wire a real authentication provider into the current auth boundary.
2. Add tenant switching and user management for invited clinic staff.
3. Build patient import review history and duplicate resolution.
4. Create recall campaign draft and approval flows.
5. Add appointment reminder workflows.
6. Add notification delivery adapters behind safe interfaces.
7. Add audit logs and operational reporting.
8. Pilot with a small clinic and measure workflow completion, not medical outcomes.

## Tenant Isolation Roadmap

- MVP: shared schema, shared PostgreSQL database, and `tenantId` on tenant-owned rows.
- Next: PostgreSQL Row-Level Security.
- Later: schema-per-tenant for mid-market tenants if needed.
- Later: database-per-tenant for enterprise tenants if paid or contractually required.
- Later: PgBouncer or equivalent connection pooling as database concurrency grows.

## Intentionally Not Implemented Yet

- Real authentication provider, login UI, tenant switching UI, and user management UI.
- Real SMS, email, WhatsApp, or phone delivery integrations.
- Payment processing.
- Real OpenAI or other AI provider calls.
- Dedicated single-tenant deployments.
- Medical diagnosis or treatment recommendation features.
