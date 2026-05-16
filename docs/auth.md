# Authentication and RBAC

Klinika360 uses `next-auth` as the first real authentication foundation. DentalOS remains the internal repository name.

## Current Strategy

- Auth route: `src/app/api/auth/[...nextauth]/route.ts`.
- Auth config: `src/server/auth/config.ts`.
- Auth boundary: `src/server/auth/index.ts`.
- Permission map: `src/server/auth/permissions.ts`.
- Session strategy: JWT session handled by NextAuth.
- First provider path: Google OAuth when configured.

The app does not use the Prisma Auth.js adapter yet. OAuth identifies the user, then Klinika360 maps the provider email to an existing `User` row and resolves `Membership` records for tenant context.

## First Clinic Admin Bootstrap

Real first-clinic provisioning is handled by the CLI-only admin bootstrap, not by an open signup route. `npm run bootstrap:admin` requires a matching `BOOTSTRAP_SECRET` and `SETUP_BOOTSTRAP_SECRET`, then creates or reuses the first `Tenant`, first owner `User`, `OWNER` `Membership`, tenant setup state, and safe audit events.

The bootstrap owner must sign in with the same Google OAuth email as `BOOTSTRAP_OWNER_EMAIL`. OAuth still only identifies the user; tenant access is granted because the bootstrap has already created the matching `User` and active `Membership`.

See `docs/admin-bootstrap.md` for local, staging, and production handling. Remove or rotate the setup secret after the one-off bootstrap run.

## Required Environment Variables

Production auth requires:

```bash
AUTH_SECRET="replace-with-secure-random-value"
AUTH_GOOGLE_ID="google-oauth-client-id"
AUTH_GOOGLE_SECRET="google-oauth-client-secret"
AUTH_URL="https://your-production-url"
NEXTAUTH_URL="https://your-production-url"
```

`NEXTAUTH_SECRET` is still accepted as a compatibility fallback, but prefer `AUTH_SECRET`.

## Tenant Resolution

Private dashboard workflows resolve:

```text
NextAuth session -> provider email -> User -> Membership -> TenantContext -> RBAC permission
```

Tenant context includes `tenantId`, `tenantName`, `userId`, `userEmail`, `membershipId`, and `role`.

If a signed-in provider user is not provisioned in `User` or has no `Membership`, private routes render a safe no-tenant access state. The app does not create tenants, users, or memberships from OAuth login yet.

## Tenant Switching

Users can have memberships in multiple tenants. The selected tenant ID is stored in an HTTP-only `klinika360_active_tenant` cookie. This cookie is a preference only; every request revalidates the selected tenant against the authenticated user's active memberships before tenant data is shown.

If the selected tenant is invalid, the app falls back to the first valid membership. Development demo mode exposes two deterministic demo tenants so the switcher can be exercised locally.

## Staff Invitations

Team management starts at `/dashboard/settings/team`.

- Owner/Admin users can create staff invitation records.
- Managers can read team settings but cannot manage roles by default.
- Invitation records store `tokenHash` only.
- No invitation email is sent yet.
- Invitation acceptance is available at `/invitations/accept?token=...` for links delivered out of band or by a future email adapter.
- The accepting user must authenticate first.
- The server hashes the submitted token and compares it to the stored `tokenHash`; token hashes are never exposed to the client.
- Invitation creation may produce a one-time delivery token in server memory for a future email adapter, but the team UI does not display it and the database stores only `tokenHash`.
- The invitation tenant and role come from the invitation record, never from client-submitted fields.
- The authenticated email must match the invited email. If it does not, the UI shows: “This invitation was issued for a different email address.”
- Expired, revoked, already accepted, invalid, and Owner-role invitations fail closed.
- Acceptance creates the `User` row when needed, creates or reactivates a membership for the invitation tenant, and closes the invitation.
- Admin users cannot assign or modify Owner memberships.
- Role changes and deactivation must preserve at least one active Owner.

## Development Demo Auth

Demo auth is disabled unless it is explicitly enabled in the environment. `.env.example` sets it to true for the local database bootstrap flow. To use the deterministic local Klinika360 demo tenant:

```bash
DEMO_AUTH_ENABLED="true"
```

Demo auth only works when `NODE_ENV` is not `production`. Production ignores demo auth even if the flag is set.

The local seed script creates the same user and memberships used by demo auth:

- User ID: `user_demo_klinika360_owner`.
- Email: `demo-user@example.test`.
- Primary tenant: `tenant_demo_klinika360`.
- Primary membership: `membership_demo_klinika360_owner` with `OWNER`.
- Secondary tenant: `tenant_demo_klinika360_specialists`.
- Secondary membership: `membership_demo_klinika360_specialists_manager` with `MANAGER`.

For local Google OAuth testing, configure real local development values for `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_URL`, and `NEXTAUTH_URL`. OAuth identifies a user by provider email, but tenant access still requires a matching `User` row and active `Membership`; automatic provisioning is not implemented yet.

## RBAC Enforcement

- Patient list pages require `patient:read`.
- Patient import pages and server actions require `patient:import`.
- Recall review requires `recall:read`.
- Campaign preparation checks `campaign:prepare`.
- Team settings require `user:read`.
- Invitations require `invitation:create` or `invitation:revoke`.
- Role updates require `membership:update`.
- Membership deactivation requires `membership:deactivate`.

Server actions that write tenant-owned data must call `requirePermission()` before parsing or persisting input.

## Intentionally Not Implemented Yet

- Staff invitation email delivery.
- Password authentication.
- Password reset.
- Full staff profile management.
- Prisma Auth.js adapter tables.
- SSO/SAML.
- Audit persistence from NextAuth callbacks.
