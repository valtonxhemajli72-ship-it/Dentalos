---
name: prisma-migration-review
description: Review DentalOS Prisma schema and migration changes for tenant-safe models, indexes, constraints, PII minimization, migration hygiene, and future RLS compatibility.
---

# Prisma Migration Review

Use this skill before changing `prisma/schema.prisma`, adding migrations, adjusting enums, or changing tenant-owned persistence.

## Tenant-Owned Model Checklist

Tenant-owned models include `Patient`, `Appointment`, `RecallCampaign`, `NotificationMessage`, `PatientImportBatch`, and `AuditLog`. Any new tenant-owned model must:

- Include `tenantId`.
- Relate to `Tenant` when practical.
- Use repository methods that require tenant context.
- Avoid global lookup helpers such as `getPatient(id)`.
- Include indexes that support tenant-scoped reads, writes, duplicate checks, and status lists.
- Keep future PostgreSQL Row-Level Security compatibility in mind.

## Constraints And Indexes

- Unique constraints for tenant-owned data should be scoped by tenant where needed.
- Duplicate prevention for patient contacts must be tenant-scoped, not global.
- Add indexes for common filters such as `tenantId`, status, due dates, and foreign keys.
- Avoid indexes on unnecessary PII or large free-text fields.
- Confirm cascading deletes do not accidentally cross tenant boundaries.

## Data Minimization

- Do not store raw CSV content.
- Do not store secrets, provider tokens, auth tokens, passwords, private keys, or raw invitation tokens.
- Do not add unnecessary PII fields.
- Prefer normalized, product-needed fields over third-party payload blobs.
- Audit metadata should store counts, statuses, IDs, and flags only.

## Enum Changes

- Add enum values safely and consider application fallback behavior.
- Avoid renaming or removing enum values without a migration and data transition plan.
- Check UI labels, filters, tests, seed data, and permission logic when enum values change.

## Migration Hygiene

- Use readable migration names that describe the domain change.
- Do not run production-impacting migrations from this checklist.
- Build and typecheck must not require a live database.
- If migrations are present, review generated SQL for tenant isolation, constraints, indexes, defaults, nullability, and destructive operations.

## Required Commands

Run these when schema or migrations change:

```bash
npx prisma format
npx prisma generate
npm run db:validate
```

Also run relevant repository checks:

```bash
npm run typecheck
npm run build
```

Do not run migrations unless the task explicitly asks for it.

## Report Format

Call out tenant-owned models touched, index and constraint changes, PII/storage impact, migration risks, commands run, and whether future RLS remains straightforward.
