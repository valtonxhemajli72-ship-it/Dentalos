---
name: auth-rbac-review
description: Review DentalOS authentication and RBAC changes for production fail-closed behavior, tenant membership resolution, permission checks, safe logging, and role-aware UI states.
---

# Auth RBAC Review

Use this skill before changing private routes, server actions, session handling, tenant switching, team management, invitation flows, or permission mappings.

## Review Order

1. Confirm private code uses `src/server/auth` and does not bypass NextAuth/Auth.js-compatible helpers.
2. Resolve the request path: user -> membership -> active tenant -> role -> permission.
3. Confirm every sensitive write calls `requirePermission()` before parsing or persisting input.
4. Check unauthenticated, unauthorized, no-tenant, and missing-provider states.
5. Review logs, audit metadata, and errors for sessions, tokens, and PII.

## Authentication Checklist

- Production must fail closed when no real auth provider/session is configured.
- Development demo auth must be local-development only, disabled by default, deterministic, and ignored in production.
- NextAuth session resolution must not be replaced by ad hoc cookies or client state.
- OAuth sign-in identifies a user only; tenant access still requires a matching `User` and active `Membership`.
- Active tenant selection must be revalidated against memberships on every request.
- Raw sessions, provider profiles, OAuth tokens, refresh tokens, invitation tokens, and cookies must not be logged or stored in audit metadata.

## RBAC Checklist

- Permissions must live in `src/server/auth/permissions.ts`; do not scatter role checks through product modules.
- Supported roles are `OWNER`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `MANAGER`, and `STAFF`; `CLINICIAN` is legacy compatibility only.
- Use permission names, not raw role comparisons, for product authorization.
- `user:manage` is required for staff and team management writes.
- `patient:import` is required for patient import persistence.
- `campaign:prepare` is required for recall campaign draft preparation.
- Audit reads, billing reads, exports, sends, and settings changes require explicit permissions.
- Admin users must not assign Owner, modify Owner memberships, or remove the last active Owner.

## UI States

- Unauthenticated users should see a safe sign-in or access-required state.
- Authenticated users without a tenant should see a safe no-access state.
- Authenticated users without permission should see an unauthorized state that does not disclose tenant data.
- Loading and error states must avoid printing raw session data, provider errors with tokens, or patient PII.
- Team management UI should reflect Owner/Admin/Manager boundaries without relying on hidden client controls as the only enforcement.

## Report Format

When reviewing, report findings first. Include file paths, affected permissions, exploit or failure mode, and a concrete fix. If no issues are found, state the residual risk, such as manual provider configuration or missing browser smoke coverage.
