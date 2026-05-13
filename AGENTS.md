# AGENTS.md

This repository is DentalOS, the internal codebase for Klinika360. Klinika360 is the public product and demo clinic identity. It is a multi-tenant SaaS platform for dental clinics, starting with patient recall, appointment reminders, follow-up automation, no-show reduction, patient import, and patient reactivation.

The product must feel serious for doctors, receptionists, clinic managers, administrative staff, and other clinic team members. Keep the initial wedge lean, but build as if enterprise review, security review, and accessibility review are normal parts of the work.

## Working Principles

- Build a modular monolith first. Do not introduce microservices without a clear operational need.
- Prefer vertical slices that connect UI, application logic, domain behavior, data access, and tests.
- Keep product UI, application logic, domain modules, database access, events/jobs, and AI orchestration separated.
- TypeScript first. Prefer explicit types at boundaries and strict validation for untrusted inputs.
- Do not add unnecessary dependencies. Use platform, framework, or existing local utilities when sufficient.
- Keep the initial product lean and sellable.
- Prefer human-readable branches such as `feature/recall-mvp`, `feature/patient-import`, `feature/import-persistence`, and `chore/enterprise-baseline`.

## Security Rules

- Do not expose secrets. Never print, commit, log, or paste real API keys, tokens, passwords, connection strings, or private certificates.
- Do not read `.env` files unless explicitly required for a safe local diagnostic, and never print their values.
- Use `.env.example` for placeholder values only.
- No PII in logs. Avoid logging patient names, contact details, treatment details, notes, or message bodies.
- Validate all inputs at system boundaries.
- Fail safely when authentication, tenant resolution, permissions, or validation are missing.
- Treat healthcare and dental data as sensitive even when the product is not making medical decisions.
- Do not make fake compliance, security, revenue, or medical claims.
- Target OWASP ASVS Level 2 for application security decisions.

## Tenant Isolation Rules

- The MVP uses a shared app and shared PostgreSQL database with `tenantId` on tenant-owned records.
- Tenant-owned data must include `tenantId` and be queried through tenant-aware access paths.
- No fetch, update, delete, list, import, export, event, or job operation for tenant-owned data may run without tenant context.
- Patient imports create `PatientImportBatch` records with counts only; never store raw CSV content.
- Private routes must resolve authenticated user and active tenant before accessing tenant data.
- Never trust tenant IDs from the client without checking membership and permissions.
- Background jobs and event handlers must carry tenant context explicitly.
- Cross-tenant admin workflows need explicit authorization and audit logs.

Tenant-owned models include `Patient`, `Appointment`, `RecallCampaign`, `NotificationMessage`, `PatientImportBatch`, and `AuditLog`. Repository functions must be named and shaped so tenant scope is obvious, for example `getPatientForTenant(tenantId, patientId)`. Do not add `getPatient(id)` style shortcuts.

## Patient Import Rules

- Require tenant context before persistence.
- Parse pasted CSV without storing raw CSV content.
- Persist only valid, non-duplicate tenant-scoped records.
- Check duplicates inside the current tenant only.
- Store `PatientImportBatch` counts and status only.
- Use audit metadata with counts, statuses, IDs, or flags only.
- Do not store patient names, emails, phones, notes, message bodies, or raw CSV in audit metadata.

## Coding Conventions

- Use Next.js App Router conventions under `src/app`.
- Place reusable UI in `src/components`.
- Place business capabilities in `src/modules`.
- Place server-only infrastructure in `src/server`.
- Keep functions small and intention-revealing.
- Use readable product copy; avoid fake claims and medical claims.
- Add comments only when they clarify non-obvious logic or security decisions.
- Public UI copy should say Klinika360. DentalOS is for internal repo or architecture references.
- Use role-aware product language: doctors review care context, receptionists manage recall and scheduling work, managers monitor operational readiness, and staff see only what their role permits.

## AI Rules

- AI is an assistant layer, not the source of truth.
- AI may draft messages, summarize operational context, or suggest workflows.
- The system validates AI output before use.
- Users approve sensitive actions.
- Store prompt templates and AI policies in an auditable registry when introduced.
- Do not send PII to AI providers without explicit product and compliance decisions.
- Do not paste real secrets or real patient data into AI coding tools.
- Review AI-generated code before merging, especially for auth, tenant isolation, PII, payment, AI, and medical workflows.

## Testing Expectations

- Add tests with the same vertical slice when behavior becomes non-trivial.
- Cover tenant isolation, permission checks, validation, and failure paths.
- Patient import tests should cover invalid dates, missing names, duplicate contacts, unsupported channels, and no PII in audit metadata.
- Keep UI tests focused on important user workflows.
- Run available checks before handoff: format, lint, typecheck, build, and Prisma validation when practical.
- Accessibility target is WCAG 2.2 AA. Preserve labels, semantic HTML, visible focus, contrast, keyboard access, and readable tables.
- Performance target is Core Web Vitals. Prefer server components, avoid large client bundles, and do not add heavy libraries without a real need.

## Git Expectations

- Work on focused branches.
- Keep commits clean and meaningful.
- Do not commit generated caches, build output, local databases, `.env` files, or secrets.
- Preserve user changes. Do not revert unrelated work.
- Commit messages should be concise and conventional when practical.
- Do not use branch names mentioning Codex, agents, bots, AI, or automation.
- Never force push unless explicitly requested.

## Review Guidelines

Review every change with these questions:

- Does authentication protect private routes?
- Is `tenantId` considered for tenant-owned data?
- Are inputs validated before domain logic runs?
- Are permissions checked before sensitive reads or writes?
- Could this log PII or secrets?
- Does audit metadata contain counts and identifiers only?
- Does patient import persistence skip duplicates conservatively and stay tenant-scoped?
- Does this fail safely?
- Are background jobs tenant-aware and idempotent?
- Is AI output validated and reviewed before action?
- Are dependencies necessary and maintained?
- Is the UI keyboard accessible and understandable for doctors, receptionists, managers, and staff?
- Does the change keep navigation fast and avoid unnecessary client-side work?

## Intentionally Not Implemented Yet

- Real authentication provider and production RBAC.
- Real SMS, email, WhatsApp, or phone delivery integrations.
- Payment processing.
- Real OpenAI or other AI provider calls.
- Dedicated single-tenant deployments.
- Medical diagnosis or clinical decision features.
