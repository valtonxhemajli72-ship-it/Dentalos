---
name: tenant-security-review
description: Review DentalOS tenant isolation for tenant-owned models, queries, server actions, dashboard routes, tenant switching, custom domains, audit safety, and owner protections.
---

# Tenant Security Review

Use this skill whenever work touches tenant-owned data, tenant switching, dashboard routes, imports, recall workflows, custom domains, membership logic, audit logs, or background jobs.

## Tenant-Owned Data Rule

Every tenant-owned model and operation requires tenant context. Tenant-owned models include `Patient`, `Appointment`, `RecallCampaign`, `NotificationMessage`, `PatientImportBatch`, and `AuditLog`. Any new tenant-owned model must follow the same rule.

## Repository And Prisma Checklist

- Queries must include `tenantId` for tenant-owned reads, writes, updates, deletes, lists, imports, exports, and duplicate checks.
- Repository function names must make tenant scope obvious, for example `getPatientForTenant(tenantId, patientId)`.
- Do not add unsafe shortcuts such as `getPatient(id)`, `updateAppointment(id)`, or `listImports()` for tenant-owned data.
- Unique constraints and duplicate checks must be tenant-scoped where the data belongs to a clinic.
- Indexes should support tenant-scoped filters, status lists, dates, and foreign keys.
- Raw CSV content, patient notes, message bodies, and other unnecessary PII must not be stored in audit metadata or import batch records.
- Cross-tenant admin workflows require explicit authorization and audit logging.

## Server Action Checklist

- Resolve authenticated user and active tenant before accessing tenant-owned data.
- Call `requirePermission()` before parsing or persisting sensitive writes.
- Never trust tenant IDs from form data, query strings, route params, headers, cookies, or client state without membership validation.
- Validate input at the boundary before domain logic.
- Fail safely when authentication, tenant resolution, permission, or validation is missing.
- Audit metadata must use counts, statuses, IDs, and flags only.

## Tenant Switching Checklist

- Active tenant selection must be revalidated against current memberships on every request.
- Tenant switching must verify the target tenant is in the authenticated user's active memberships.
- A stale, revoked, or inactive membership must not retain access through a cookie.
- The selected tenant cookie must not be treated as authorization.
- No role change or membership deactivation may remove the last active `OWNER`.

## Custom Domain Checklist

- Host-based tenant resolution must map only verified domains to tenants.
- Unknown, unverified, disabled, or ambiguous hosts must fail closed.
- Custom domain lookup does not replace user membership checks.
- Redirects and callback URLs must be validated to avoid open redirects.
- Branding loaded from a tenant domain must not leak private tenant data before authorization.

## Dashboard Route Checklist

- Private routes must resolve authenticated user and active tenant before tenant data access.
- Pages must handle unauthenticated, unauthorized, no-tenant, loading, empty, and error states safely.
- Unauthorized UI must not expose tenant-owned records in markup, data attributes, or error text.
- Route-level checks and server action checks are both required; hiding a client button is not authorization.

## Review Output

Report any missing tenant context, unsafe repository shape, client-trusted tenant ID, custom-domain ambiguity, PII in audit metadata, or missing last-owner protection as a blocking issue.
