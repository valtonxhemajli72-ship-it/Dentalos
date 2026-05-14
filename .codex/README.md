# DentalOS Codex Skills

This folder contains reusable Codex skills for DentalOS. They are guardrails and checklists for future repository work, not runtime code and not application configuration.

`AGENTS.md` remains the main project constitution. These skills make the constitution easier to apply during focused tasks, especially when work touches tenant isolation, authentication, RBAC, Prisma, audit logs, PII, dependencies, accessibility, custom domains, observability, release readiness, or security review.

## How To Use Skills

Future Codex tasks should explicitly name the relevant skill before implementation or review. Use the narrowest skill that fits the risk area, then use `security-diff-review` before committing major auth, tenant, data, or security-sensitive changes.

Example usage phrases:

- Use tenant-security-review for this task.
- After implementation, run security-diff-review.
- Use prisma-migration-review before changing schema.prisma.
- Use custom-domain-tenancy before implementing host-based tenant resolution.
- Use pii-and-audit-review for this audit logging change.
- Use enterprise-frontend-accessibility for this dashboard workflow.

## Available Skills

- `tenant-security-review`: tenant isolation, tenant-owned queries, tenant switching, dashboard routes, and custom domain tenancy boundaries.
- `auth-rbac-review`: production fail-closed auth, session resolution, role permission mapping, team permissions, and unauthorized UI states.
- `prisma-migration-review`: tenant-safe schema changes, indexes, constraints, migration hygiene, and Prisma validation.
- `pii-and-audit-review`: logs, audit metadata, telemetry, invitation tokens, CSV handling, and safe audit event shape.
- `dependency-maintenance`: Dependabot review, major upgrade caution, audit checks, CI checks, and dependency discipline.
- `enterprise-frontend-accessibility`: WCAG 2.2 AA dashboard UI review with role-aware enterprise workflows.
- `observability-no-pii`: logging, metrics, Sentry-style reporting, labels, fallback behavior, and future observability integrations without PII.
- `custom-domain-tenancy`: verified custom domains, host-based tenant resolution, auth callbacks, cookies, branding, and tenant leakage prevention.
- `release-readiness`: pre-PR and pre-release checks, clean branch, build validation, docs, rollback notes, and pilot readiness.
- `security-diff-review`: final review of changed auth, tenant, data, dependency, redirect, audit, and logging surfaces.

## Boundaries

- Do not paste real secrets, API keys, connection strings, private certificates, auth tokens, passwords, or real patient data into prompts or skill files.
- Do not use these skills to bypass `AGENTS.md`, CI, code owner review, or human review for security-sensitive code.
- Do not add runtime dependencies, integrations, infrastructure, or claims because a checklist mentions a future capability.
- Keep skills small, practical, and aligned with current DentalOS architecture.
