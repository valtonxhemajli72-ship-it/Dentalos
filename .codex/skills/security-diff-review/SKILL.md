---
name: security-diff-review
description: Run a final DentalOS security review over the current git diff, focusing on tenant isolation, auth bypass, PII, secrets, redirects, dependencies, Prisma changes, and unsafe logs.
---

# Security Diff Review

Use this skill after any major feature and before commit or PR. This is a review skill. Do not rewrite code unless the user asks, except for obvious documentation or typo fixes that do not change behavior.

## Review Inputs

Run or inspect:

```bash
git status
git diff --stat
git diff
```

Also inspect staged diff if a commit has already been prepared:

```bash
git diff --staged
```

## High-Risk Surfaces

- Changed server actions.
- Changed repository methods and Prisma queries.
- Changed auth, session, tenant switching, invitation, or permission logic.
- Changed Prisma schema, migrations, seed data, or generated data access.
- Changed redirects, callback URLs, host parsing, or custom domain resolution.
- Changed audit logs, logging, metrics, telemetry, or error reporting.
- Changed dependencies, package manager files, GitHub Actions, or security config.

## Findings To Flag

- Tenant-owned reads, writes, updates, deletes, imports, exports, events, or jobs without tenant context.
- Client-supplied tenant IDs trusted without membership validation.
- Repository helpers shaped like `getPatient(id)` for tenant-owned data.
- Server actions that write before `requirePermission()`.
- Auth bypass, production demo auth, raw session trust, or missing membership checks.
- Missing last-owner protection for role or membership changes.
- Patient PII, secrets, raw CSV, raw invitation tokens, auth tokens, or passwords in logs, audit metadata, telemetry, docs, or tests.
- Unsafe redirects or unvalidated callback URLs.
- Dependency changes that introduce heavy infrastructure, unnecessary packages, or major upgrade risk.
- Build or validation paths that require a live database unexpectedly.

## Report Format

Lead with findings ordered by severity. Each finding should include file path, line or function when available, why it matters, and a concrete fix. Then list residual risks and checks run. If no issues are found, say so clearly and mention any remaining test or manual review gaps.
