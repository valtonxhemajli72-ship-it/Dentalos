# PostgreSQL RLS Readiness

Klinika360 currently enforces tenant isolation in the application layer: authenticated users resolve an active tenant through `Membership`, server actions require permissions, and tenant-owned repositories include `tenantId` in reads and writes. PostgreSQL Row-Level Security is the next defense-in-depth step for the shared-schema database. It is not implemented or enabled yet.

RLS must not replace application authorization. The application must still authenticate users, validate tenant membership, check RBAC permissions, validate inputs, keep PII out of logs and audit metadata, and use tenant-scoped repository functions.

## Model Classification

| Model                   | Tenant-owned?                 | Has tenantId? | Current isolation method                                                                                                                          | Future RLS policy shape                                                                                                             | Risks / notes                                                                                                                                                               |
| ----------------------- | ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tenant`                | No, root tenant record        | No            | Access is mediated through authenticated `Membership` records and bootstrap is CLI-only.                                                          | Special policy or service-owned access path; tenant rows should be visible only through memberships or controlled admin operations. | Avoid support/admin list routes that expose tenant metadata without explicit cross-tenant authorization and audit.                                                          |
| `User`                  | No, global auth-owned record  | No            | OAuth/demo identity maps to a `User`, then tenant access is granted only through `Membership`.                                                    | Auth-owned policy separate from tenant data; tenant-scoped flows should join through `Membership`, not expose all users.            | Email is globally unique by design for identity. User lookup alone must never grant tenant access.                                                                          |
| `Membership`            | Join/access-control record    | Yes           | `@@unique([tenantId, userId])`, membership resolution, role checks, and last-owner protection.                                                    | Tenant policy for tenant management reads/writes, plus actor-aware service logic for "my memberships" discovery.                    | RLS needs a careful bootstrap/sign-in path because tenant context is derived from memberships.                                                                              |
| `TenantInvitation`      | Yes, tenant access workflow   | Yes           | Tenant-scoped list/revoke/create; acceptance hashes raw token server-side, derives tenant and role from the invitation, and enforces email match. | Tenant policy for list/revoke/create. Acceptance may need a restricted server-side token lookup before setting tenant context.      | `tokenHash` is globally unique for lookup and must never be exposed. Raw tokens are never stored.                                                                           |
| `Patient`               | Yes                           | Yes           | Tenant-scoped repository methods and tenant-scoped patient/import pages.                                                                          | `USING ("tenantId" = current_setting('app.current_tenant_id', true))` and matching `WITH CHECK`.                                    | Patient contact fields are indexed by tenant only; do not add global unique constraints for PII.                                                                            |
| `Appointment`           | Yes                           | Yes           | Tenant-scoped rows and `@@index([tenantId, startsAt])`, `@@index([tenantId, patientId])`.                                                         | Same tenant policy as `Patient`.                                                                                                    | `patientId` references `Patient.id` only today; future composite FK should enforce `Appointment.tenantId = Patient.tenantId`.                                               |
| `RecallCampaign`        | Yes                           | Yes           | Tenant-scoped rows and `@@index([tenantId, status])`.                                                                                             | Same tenant policy as `Patient`; `patientId` may be null for tenant-wide campaigns.                                                 | Optional `patientId` references `Patient.id` only today; future composite FK or invariant checks should prevent cross-tenant patient links.                                 |
| `RecallCampaignPatient` | Yes                           | Yes           | Tenant-scoped join rows record selected campaign audience patients and require server-side tenant audience validation before writes.              | Same tenant policy as `Patient`; selected audience rows should be visible only inside the active tenant.                            | Current FKs point to `RecallCampaign.id` and `Patient.id`; future composite FKs should enforce all three tenant IDs match.                                                  |
| `NotificationMessage`   | Yes                           | Yes           | Tenant-scoped rows with indexes for status scheduling and patient lookup.                                                                         | Same tenant policy as `Patient`.                                                                                                    | Optional patient, appointment, and campaign references are by ID only today; future composite FKs and tenant-scoped child indexes should be added as query patterns mature. |
| `PatientImportBatch`    | Yes                           | Yes           | Tenant-scoped import persistence stores source/status/counts only, with `@@index([tenantId, createdAt])` and `@@index([tenantId, status])`.       | Same tenant policy as `Patient`.                                                                                                    | `createdByUserId` points to global `User`; application must keep membership checks before writes.                                                                           |
| `AuditLog`              | Tenant-specific system record | Yes           | Audit writer requires tenant ID and rejects unsafe metadata keys for PII, tokens, secrets, raw CSV, sessions, and provider payloads.              | Tenant policy for tenant audit reads/writes; privileged operational audit access must be explicit.                                  | `entityType` and `entityId` are intentionally generic, so DB constraints cannot prove target tenant consistency yet.                                                        |

## Relationship Consistency Findings

Current tenant isolation is application-enforced and reviewable, but several tenant-owned relationships can be made stronger before RLS is enabled.

- `Appointment.patientId` should eventually become a composite tenant relationship to `Patient` using `(tenantId, patientId) -> (tenantId, id)`. This requires a parent composite unique constraint such as `Patient(tenantId, id)` even though `Patient.id` is already globally unique.
- `RecallCampaign.patientId` should follow the same pattern for patient-specific campaigns. The nullable field remains valid for tenant-wide campaign records.
- `RecallCampaignPatient.campaignId` and `patientId` should eventually use composite tenant relationships to prevent a join row from connecting a campaign and patient from different tenants.
- `NotificationMessage.patientId`, `appointmentId`, and `recallCampaignId` should eventually use composite tenant relationships to their parent tables. Add tenant-scoped indexes such as `(tenantId, appointmentId)` and `(tenantId, recallCampaignId)` when those lookup paths become active.
- `PatientImportBatch.createdByUserId`, `TenantInvitation.invitedByUserId`, and `TenantInvitation.acceptedByUserId` point to global `User` records. Database constraints alone cannot prove the actor's current membership in every historical case, so server-side membership and permission checks remain required.
- `AuditLog.entityType` and `entityId` are generic by design. They should stay safe through audit helper APIs, no-PII metadata validation, and future typed audit target patterns if the product needs stronger referential guarantees.

Recommended future migration path:

1. Add composite unique constraints to tenant-owned parent tables that are referenced by tenant-owned children.
2. Backfill and validate any rows whose child `tenantId` does not match the parent row.
3. Add composite foreign keys in staging and run repository/server action integration tests.
4. Add tenant-scoped child indexes for active query paths.
5. Enable RLS policies in staging only after consistency checks pass.

## Index Review

The current schema already includes tenant-scoped indexes for patient name/contact lookup, recall due dates, appointment schedules, import batch lists, invitation lists, membership role lookup, and audit log timelines.

Conservative future index candidates:

- `NotificationMessage(tenantId, appointmentId)` for appointment reminder history and cancellation cleanup.
- `NotificationMessage(tenantId, recallCampaignId)` for campaign delivery review.
- `RecallCampaign(tenantId, patientId)` if patient-specific campaign history becomes a common lookup.
- `AuditLog(tenantId, entityType, entityId, createdAt)` if entity audit history becomes user-facing.
- `TenantInvitation(tenantId, expiresAt)` if invitation expiration cleanup becomes frequent.

Do not add global unique constraints for patient email or phone. Patient contact data may collide across clinics and must remain tenant-scoped.

## Future RLS Design

RLS should be defense-in-depth for shared-schema mistakes. It should block accidental cross-tenant reads or writes if application code misses a `tenantId` filter, but it must not be used as the only authorization layer.

DentalOS currently uses Prisma `String` IDs with `cuid()` defaults, so the policy shape should compare strings unless tenant IDs are migrated to UUIDs later:

```sql
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_tenant_isolation ON "Patient"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
```

Apply the same shape to tenant-owned tables after tenant consistency constraints and staging tests are in place. If IDs are migrated to UUIDs in a future migration, the policy can use a UUID cast at that time.

Server code would set tenant context inside the same transaction as the tenant-owned queries:

```ts
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`
    SELECT set_config('app.current_tenant_id', ${tenantId}, true)
  `;

  // Tenant-owned reads and writes happen here.
});
```

The third `set_config` argument keeps the setting transaction-local. Do not set tenant context globally on a pooled connection. Do not log tenant context failures with patient fields, raw invitation tokens, token hashes, sessions, OAuth tokens, setup secrets, or raw request payloads.

## PgBouncer And Pooling Risks

Connection pooling changes how PostgreSQL session state behaves. RLS rollout must account for:

- Transaction pooling, where any setting must be applied inside the same transaction as the protected query.
- Connection reuse, where connection-level `SET` can leak tenant context to a later request.
- Prisma interactive transaction behavior, prepared statement settings, and migration commands under PgBouncer.
- Operational roles that may bypass RLS. Bypass roles should be limited to migrations and tightly controlled maintenance workflows.

The safe default is transaction-local tenant context with `set_config(..., true)` and no tenant-owned query outside the transaction when RLS is required.

## Rollout Strategy

1. Keep application-layer auth, RBAC, tenant-scoped repositories, audit metadata checks, and validation scripts passing.
2. Add tenant consistency checks and conservative tenant-scoped indexes.
3. Add composite tenant foreign keys in staging after backfill validation.
4. Add RLS policies in staging with read policies first.
5. Add write policies with `WITH CHECK`.
6. Run integration tests for dashboard pages, server actions, imports, invitations, tenant switching, bootstrap, and audit logs.
7. Test Prisma with the intended PgBouncer or managed pooler mode.
8. Monitor RLS denials and application errors without logging PII.
9. Roll out to production only after rollback and maintenance procedures are rehearsed.

## Exit Criteria For Production RLS

- All tenant-owned tables are classified and documented.
- Tenant-owned child relationships either have composite tenant constraints or documented application invariants with tests.
- RLS policies are tested in staging with the same pooling mode planned for production.
- Server code sets tenant context transaction-locally for protected queries.
- Privileged migration/maintenance roles are documented and restricted.
- Validation commands pass without a live database where possible.
- Audit and operational logs remain free of PII, raw tokens, token hashes, sessions, and secrets.
