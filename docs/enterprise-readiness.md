# Klinika360 Enterprise Readiness

Klinika360 is the public product and demo clinic identity. DentalOS remains the internal repository codename.

Enterprise readiness means the product is secure, accessible, fast, reviewable, and honest about what is not implemented yet. It does not mean adding enterprise complexity before the recall and import wedge has proven value.

## Baseline Targets

- Application security: OWASP ASVS Level 2 as the design target.
- Accessibility: WCAG 2.2 AA.
- Performance: Core Web Vitals, fast dashboard navigation, and minimal client-side code.
- Tenancy: shared app, shared PostgreSQL, `tenantId` on tenant-owned records.
- Database isolation roadmap: application-layer tenant isolation now, tenant consistency constraints next, PostgreSQL RLS later after staging validation.
- Governance: CI required checks, code owners, security reporting, dependency monitoring, and secret scanning.
- Platform posture: document long-term infrastructure choices early, but keep current implementations no-op or local until explicitly needed.

## Clinic Roles

- Doctors review patient care context, recall readiness, and follow-up queues.
- Receptionists manage recall calls, reminders, imports, and scheduling work.
- Clinic managers monitor no-shows, recall readiness, import status, and clinic activity.
- Administrative staff work from role-appropriate operational lists.

The RBAC permission map exists in code and private dashboard flows use it before tenant data access. NextAuth with Google OAuth is wired as the first real provider path. Tenant switching, staff invitation records, and invitation acceptance are available as a foundation, while invitation email delivery is still deferred. Production auth fails safely when provider credentials or tenant memberships are missing.

First clinic provisioning is available through a guarded CLI bootstrap only. It creates the initial tenant, owner user, owner membership, setup state, and safe audit events without creating a public signup path.

## Tenant Isolation Checklist

- Resolve authenticated user and active tenant before tenant-owned data access.
- Verify membership and role before sensitive reads, exports, imports, sends, or billing actions.
- Require `tenantId` in every tenant-owned query and write.
- Do not trust tenant IDs sent by the client without server-side membership checks.
- Carry tenant context into background jobs, events, audit logs, and future notification workflows.
- Review repository function names for tenant scope, for example `listPatientsForTenant`.

## Import Persistence Security Rules

- Pasted CSV is parsed and validated but not stored as raw CSV.
- `PatientImportBatch` stores source, status, and counts only.
- Duplicate checks are tenant-scoped.
- Invalid rows and duplicates are skipped conservatively.
- Audit metadata uses counts, statuses, IDs, and flags only.
- Patient names, emails, phones, notes, message bodies, and raw CSV never belong in audit metadata.

## Production Hardening Checklist

- Configure production Google OAuth credentials and a strong auth secret behind `src/server/auth`.
- Run first clinic admin bootstrap only from a trusted operator environment with `SETUP_BOOTSTRAP_SECRET`, then remove or rotate the setup secret.
- Add email delivery for invited clinic staff behind a reviewed notification adapter.
- Keep invitation acceptance token validation, email match, tenant-derived membership creation, and no-PII audit metadata intact.
- Keep route-level permission checks for doctors, receptionists, managers, and staff.
- Preserve last-owner protection for every role management workflow.
- Keep production dashboard pages from falling back to demo patient or recall records when persistence is unavailable.
- Run `npm run tenant:validate` for tenant isolation, server action, invitation, audit, and demo fallback guardrail changes.
- Run `npm run rls:validate` for RLS readiness docs and schema guardrails before DB-level tenant isolation work.
- Run `npm run campaign:validate` for recall campaign builder route, action, permission, schema, no-send, and documentation guardrails.
- Treat PostgreSQL RLS as planned defense-in-depth only until staging policies, tenant context transactions, PgBouncer behavior, and rollback procedures are validated.
- Enable branch protection with required CI, CodeQL, Semgrep, secret scanning, and review.
- Configure production secrets through the deployment platform, not Git.
- Review security headers and move CSP from report-only to enforced mode after validation.
- Add automated accessibility smoke tests once browser test infrastructure is introduced.
- Define retention, export, and deletion policies before storing patient communications at scale.
- Use the platform roadmap before introducing Temporal, Debezium, ClickHouse, OPA, Unleash, OpenMeter, Falco, Chaos Mesh, cert-manager, External Secrets Operator, Prometheus, or Grafana.

## Local Hooks

No hook dependency is installed yet. Keep local development predictable for the MVP and run these commands before pushing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run db:validate
npm run build
npm audit --audit-level=high
```

Add Husky, lint-staged, or Lefthook later when the team agrees on the local workflow.

## Intentionally Not Implemented Yet

- Real SMS, email, WhatsApp, or phone delivery integrations.
- Recall campaign delivery, approval, retries, and provider callbacks. The current campaign builder saves no-send DRAFT planning records only.
- Payment processing.
- Real OpenAI or other AI provider calls.
- Dedicated single-tenant deployments.
- Complex workflow engine or Temporal.
- Medical diagnosis, treatment recommendations, or clinical decision support.
