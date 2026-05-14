# DentalOS Agent Operating Model

DentalOS is the internal repository name. Klinika360 is the public product identity. This operating model helps future Codex sessions work like a small senior product engineering team while still treating `AGENTS.md` as the project constitution.

The `.codex/skills` files are reusable guardrails and checklists. They are not runtime code, CI configuration, security certification, or a replacement for human review on security-sensitive work.

## Recommended Agent Roles

| Role                                 | Use When                                                                                                                            | Primary Skills                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Product SaaS Architect               | Shaping scope, sequencing vertical slices, deciding what stays lean for the MVP, or reviewing public product language.              | `release-readiness`, `enterprise-frontend-accessibility`                            |
| Security & Tenant Isolation Reviewer | Touching tenant-owned data, tenant switching, custom domains, server actions, cross-tenant support paths, or major dashboard flows. | `tenant-security-review`, `security-diff-review`, `pii-and-audit-review`            |
| Backend Domain Engineer              | Implementing patient import, recall, reminders, campaigns, notifications, jobs, or domain services.                                 | `tenant-security-review`, `pii-and-audit-review`, `release-readiness`               |
| Auth & Identity Engineer             | Changing NextAuth/Auth.js configuration, sessions, membership resolution, invitations, team management, or permission maps.         | `auth-rbac-review`, `tenant-security-review`, `security-diff-review`                |
| Database & Prisma Reviewer           | Changing `schema.prisma`, migrations, repository methods, seed data, indexes, constraints, or tenant-owned persistence.             | `prisma-migration-review`, `tenant-security-review`, `pii-and-audit-review`         |
| Frontend UX Accessibility Reviewer   | Changing dashboard UI, forms, tables, import screens, recall workflows, empty states, or role-specific pages.                       | `enterprise-frontend-accessibility`, `auth-rbac-review`                             |
| DevOps & CI Reviewer                 | Changing GitHub Actions, dependency policy, build commands, release checks, or repository governance.                               | `dependency-maintenance`, `release-readiness`, `security-diff-review`               |
| Observability Reviewer               | Adding logs, metrics, error reporting, traces, audit-adjacent events, or operational dashboards.                                    | `observability-no-pii`, `pii-and-audit-review`                                      |
| Performance & Scale Reviewer         | Reviewing client bundle impact, query shape, indexes, future workflow boundaries, or tenant scaling choices.                        | `enterprise-frontend-accessibility`, `prisma-migration-review`, `release-readiness` |
| QA/Release Reviewer                  | Preparing PRs, handoff summaries, pilot readiness, smoke tests, rollback notes, and known limitations.                              | `release-readiness`, `security-diff-review`                                         |

## How To Run A Task

1. Inspect the repository state, current branch, open changes, relevant docs, and affected files.
2. Choose or create a focused branch from current `main` unless the task explicitly continues an existing branch.
3. Use the relevant skill before implementation or review.
4. Implement the smallest vertical slice that satisfies the task.
5. Run practical checks such as format, lint, typecheck, Prisma validation, build, audit, and targeted tests.
6. Run `security-diff-review` before committing major auth, tenant, data, dependency, redirect, observability, or security-sensitive changes.
7. Commit and push only intentional changes, then open a PR when appropriate.

## Skill Mapping By Work Type

- Tenant-owned repositories, imports, recall data, jobs, events, exports, or dashboard data access: `tenant-security-review`.
- Auth, sessions, memberships, invitations, team settings, role changes, or permission maps: `auth-rbac-review`.
- Prisma schema, migrations, indexes, constraints, enums, seed data, or generated client behavior: `prisma-migration-review`.
- Logs, audit metadata, telemetry, event payloads, prompt payloads, imports, and invitation tokens: `pii-and-audit-review`.
- Dependabot, `package.json`, lockfiles, npm audit, GitHub Actions, or major tooling upgrades: `dependency-maintenance`.
- Dashboard UI, forms, tables, empty/error/loading/unauthorized states, keyboard flows, and client component impact: `enterprise-frontend-accessibility`.
- Sentry-style reporting, metrics, traces, OpenTelemetry, Prometheus, Grafana, or safe logging adapters: `observability-no-pii`.
- Host-based tenant routing, custom domains, DNS verification, callback URLs, cookies, and tenant branding: `custom-domain-tenancy`.
- PR handoff, pilot readiness, docs, rollback notes, and final checks: `release-readiness`.
- Final security review of changed files before commit or PR: `security-diff-review`.

## Full-Access Codex Rules

- Never force push.
- Never overwrite uncommitted user changes.
- Never commit `.env` files, secrets, tokens, private certificates, passwords, connection strings, local databases, generated caches, `node_modules`, or build output.
- Never paste or store real patient data in prompts, docs, tests, audit examples, logs, telemetry, or skill files.
- Do not add unnecessary dependencies.
- Do not install Temporal, Kafka, Debezium, ClickHouse, OPA, Unleash, OpenMeter, Falco, Chaos Mesh, cert-manager, External Secrets Operator, Prometheus, Grafana, Kubernetes manifests, real delivery integrations, payments, or AI provider calls unless explicitly requested.
- Do not make fake compliance, security, revenue, SLA, or medical claims.
- Keep public product copy as Klinika360 and internal architecture references as DentalOS.

## Human Review Boundary

Skills improve consistency, but they do not replace human review for authentication, authorization, tenant isolation, patient data, payments, AI workflows, security operations, compliance, legal, or production release decisions.
