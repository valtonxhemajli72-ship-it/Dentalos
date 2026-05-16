# ADR-012: PostgreSQL RLS Readiness

## Status

Planned / Accepted as strategy

## Context

Klinika360 uses a shared application and shared PostgreSQL database with `tenantId` on tenant-owned rows. Application-layer tenant isolation is already enforced through authenticated user resolution, membership validation, RBAC permissions, server action guardrails, tenant-scoped repositories, and safe audit metadata.

The next isolation milestone is database-level defense-in-depth with PostgreSQL Row-Level Security. The goal is to reduce blast radius if future application code accidentally omits tenant filters, while preserving the current auth/RBAC model and local development stability.

## Decision

Prepare for PostgreSQL RLS, but do not enable production RLS yet.

The strategy is:

- Keep application-layer authorization as the primary product control.
- Use RLS as defense-in-depth for tenant-owned tables.
- Use a PostgreSQL setting such as `app.current_tenant_id` for current tenant context.
- Set tenant context transaction-locally before tenant-owned queries.
- Add tenant consistency constraints and indexes before enforcing policies.
- Validate Prisma, migrations, and PgBouncer behavior in staging before production rollout.

Because the current Prisma schema uses `String @default(cuid())` IDs, initial policies should compare string tenant IDs. UUID casts are appropriate only if tenant IDs are migrated to UUIDs later.

## Consequences

- Tenant isolation will have both application and database layers once RLS is implemented.
- Server code will need an explicit transaction-local tenant context path for tenant-owned queries.
- RLS rollout must be tested with the same connection pooling mode used in production.
- Invitation acceptance and membership discovery need careful design because they help derive tenant context.
- Migration and maintenance roles must be restricted and documented because privileged roles can bypass RLS.

## Current Implementation

- Tenant-owned models include `tenantId`.
- Tenant-scoped repositories and server actions require tenant context and permissions.
- Membership uniqueness prevents duplicate user/tenant memberships.
- Patient contact indexes are tenant-scoped and do not create global PII uniqueness.
- Invitation records store `tokenHash` only; raw tokens are not persisted.
- Audit metadata guardrails reject PII, secrets, raw CSV, tokens, token hashes, sessions, and provider payloads.
- `docs/rls-readiness.md` documents model classification, relationship risks, future constraints, index candidates, policy shape, and rollout gates.

## Deferred Implementation

- Enabling PostgreSQL RLS on tenant-owned tables.
- Adding composite tenant foreign keys between tenant-owned child and parent tables.
- Refactoring repository execution into transaction-local tenant context wrappers.
- Staging integration tests that prove RLS behavior under Prisma and the selected pooler.
- Production rollout and operational runbooks.

## Risks

- Connection-level tenant settings can leak across pooled connections if not transaction-local.
- PgBouncer transaction pooling can break assumptions if tenant context and queries do not run in the same transaction.
- RLS can block sign-in, tenant switching, or invitation acceptance if membership and invitation discovery paths are not designed separately.
- Generic audit targets cannot be fully tenant-validated by foreign keys.
- Overly broad database roles can bypass RLS and reduce its value.
- Policy errors must not log patient PII, invitation tokens, token hashes, sessions, OAuth tokens, setup secrets, or raw payloads.

## Rollout Plan

1. Keep application-layer tenant isolation and validation scripts passing.
2. Add tenant consistency checks and conservative tenant-scoped indexes.
3. Add composite tenant constraints in staging after validating existing data.
4. Add RLS policies in staging, starting with read policies.
5. Add write policies with `WITH CHECK`.
6. Run dashboard, import, invitation, tenant switching, bootstrap, and audit integration tests.
7. Test Prisma under the intended PgBouncer or managed pooler mode.
8. Monitor RLS denials and application errors with no-PII logs.
9. Roll out to production only after rollback and maintenance procedures are rehearsed.

## Exit Criteria For Enabling RLS

- Every tenant-owned table is documented and has `tenantId`.
- Tenant-owned child references have composite tenant constraints or tested application invariants.
- Server code sets `app.current_tenant_id` transaction-locally before protected tenant-owned queries.
- Staging passes RLS-enabled integration tests under production-like pooling.
- Migration, maintenance, and break-glass roles are documented and least-privilege.
- No docs, UI, or release notes claim compliance or medical guarantees from RLS.
- No PII or secrets appear in RLS-related logs, errors, migrations, scripts, or audit metadata.
