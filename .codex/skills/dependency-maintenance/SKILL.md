---
name: dependency-maintenance
description: Review DentalOS dependency and GitHub Actions updates with caution for major upgrades, audit results, CI checks, and documentation hygiene.
---

# Dependency Maintenance

Use this skill for Dependabot PRs, manual package upgrades, lockfile changes, GitHub Actions updates, and security advisory remediation.

## Ground Rules

- Do not add unnecessary dependencies.
- Do not disable Dependabot entirely.
- Do not blindly merge major upgrades.
- Prefer platform, framework, or existing local utilities when sufficient.
- Keep dependency changes separate from feature work unless the upgrade is required for the feature.
- Never commit `.env`, generated caches, `node_modules`, build output, local databases, or secrets.

## Dependabot Review

- Inspect the PR title, changelog, release notes, changed package names, and semver range.
- Verify whether the PR is npm, GitHub Actions, or tooling.
- For grouped updates, identify the riskiest package and review it first.
- Confirm the lockfile changed only as expected.
- Run `npm ci` when practical before validation.
- Run `npm audit --audit-level=high` and document remaining high-severity issues.

## Major Upgrade Caution

- Prisma major upgrades require extra review of generated client behavior, schema validation, migrations, and database compatibility.
- Tailwind major upgrades require visual review of dashboard pages, forms, tables, focus states, and responsive layouts.
- ESLint major upgrades require config review, changed rule defaults, and CI parity.
- Next.js and React major upgrades require route behavior, server action, auth callback, and build output review.
- GitHub Actions major updates require action permissions, pinned behavior, Node version compatibility, and secret exposure review.

## Required Checks

Run the relevant checks before handoff:

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run typecheck
npm run build
```

Also run these when practical:

```bash
npm run format:check
npm run db:validate
npm run auth:validate
```

If `schema.prisma` changed, use `prisma-migration-review` and run Prisma format/generate.

## Documentation

- Update `docs/dependency-maintenance.md` when dependency policy, risk notes, ignored advisories, or upgrade procedures change.
- Document any major upgrade limitations, manual migration steps, or follow-up issues.
- Do not make fake security, compliance, uptime, or vendor support claims.

## Report Format

Summarize package/action changes, risk level, checks run, audit result, and any manual follow-up needed. For blocked upgrades, explain the blocker and safer path.
