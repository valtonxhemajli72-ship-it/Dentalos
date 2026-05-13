# ADR-001: Multi-Tenant Isolation Strategy

## Status

Accepted

## Context

Klinika360 is multi-tenant from day one. The MVP needs to move quickly without creating single-tenant assumptions, while the enterprise roadmap needs stronger isolation options for higher-value tenants.

## Decision

Use a staged isolation model:

1. MVP: shared application, shared PostgreSQL database, shared schema, and `tenantId` on tenant-owned rows.
2. Next: PostgreSQL Row-Level Security for defense-in-depth.
3. Later: schema-per-tenant for mid-market tenants if needed.
4. Later: database-per-tenant for enterprise tenants if paid or contractually required.

Repository functions must require tenant context. Tenant-owned fetch, update, delete, list, import, export, event, and job operations must include `tenantId`.

## Consequences

- The MVP stays lean and affordable.
- Tenant isolation remains visible in code review.
- Future enterprise tiers can be added without rewriting product modules.
- Query helpers and reviews must stay strict because shared-schema mistakes can be serious.

## What Is Implemented Now

- Tenant-owned Prisma models include `tenantId`.
- Tenant helpers require and assert tenant scope.
- Patient import, patients, recall, and audit flows use tenant context.

## What Is Intentionally Deferred

- PostgreSQL RLS policies.
- Schema-per-tenant.
- Database-per-tenant.
- Regional database topology.
- Dedicated enterprise deployments.
