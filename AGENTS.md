# AGENTS.md

This repository is DentalOS, the internal codebase for Klinika360, a multi-tenant SaaS product for dental clinics. The first sellable wedge is patient recall, appointment reminders, follow-up automation, no-show reduction, and patient reactivation. The long-term product can expand into patients, appointments, documents, billing, notifications, reports, integrations, and AI-assisted workflows.

## Working Principles

- Build a modular monolith first. Do not introduce microservices without a clear operational need.
- Prefer vertical slices that connect UI, application logic, domain behavior, data access, and tests.
- Keep product UI, application logic, domain modules, database access, events/jobs, and AI orchestration separated.
- TypeScript first. Prefer explicit types at boundaries and strict validation for untrusted inputs.
- Do not add unnecessary dependencies. Use platform, framework, or existing local utilities when sufficient.
- Keep the initial product lean and sellable.

## Security Rules

- Do not expose secrets. Never print, commit, log, or paste real API keys, tokens, passwords, connection strings, or private certificates.
- Do not read `.env` files unless explicitly required for a safe local diagnostic, and never print their values.
- Use `.env.example` for placeholder values only.
- No PII in logs. Avoid logging patient names, contact details, treatment details, notes, or message bodies.
- Validate all inputs at system boundaries.
- Fail safely when authentication, tenant resolution, permissions, or validation are missing.
- Treat healthcare and dental data as sensitive even when the product is not making medical decisions.

## Tenant Isolation Rules

- DentalOS MVP uses a shared app and shared PostgreSQL database with `tenantId` on tenant-owned records.
- Tenant-owned data must include `tenantId` and be queried through tenant-aware access paths.
- No fetch, update, delete, list, import, export, event, or job operation for tenant-owned data may run without tenant context.
- Patient imports create `PatientImportBatch` records with counts only; never store raw CSV content.
- Private routes must resolve authenticated user and active tenant before accessing tenant data.
- Never trust tenant IDs from the client without checking membership and permissions.
- Background jobs and event handlers must carry tenant context explicitly.
- Cross-tenant admin workflows need explicit authorization and audit logs.

## Coding Conventions

- Use Next.js App Router conventions under `src/app`.
- Place reusable UI in `src/components`.
- Place business capabilities in `src/modules`.
- Place server-only infrastructure in `src/server`.
- Keep functions small and intention-revealing.
- Use readable product copy; avoid fake claims and medical claims.
- Add comments only when they clarify non-obvious logic or security decisions.

## AI Rules

- AI is an assistant layer, not the source of truth.
- AI may draft messages, summarize operational context, or suggest workflows.
- The system validates AI output before use.
- Users approve sensitive actions.
- Store prompt templates and AI policies in an auditable registry when introduced.
- Do not send PII to AI providers without explicit product and compliance decisions.

## Testing Expectations

- Add tests with the same vertical slice when behavior becomes non-trivial.
- Cover tenant isolation, permission checks, validation, and failure paths.
- Patient import tests should cover invalid dates, missing names, duplicate contacts, unsupported channels, and no PII in audit metadata.
- Keep UI tests focused on important user workflows.
- Run available checks before handoff: format, lint, typecheck, build, and Prisma validation when practical.

## Git Expectations

- Work on focused branches.
- Keep commits clean and meaningful.
- Do not commit generated caches, build output, local databases, `.env` files, or secrets.
- Preserve user changes. Do not revert unrelated work.
- Commit messages should be concise and conventional when practical.

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
