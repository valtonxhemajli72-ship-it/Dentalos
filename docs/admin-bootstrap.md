# First Clinic Admin Bootstrap

Klinika360 needs a controlled way to create the first real clinic tenant, first owner user, and initial `OWNER` membership before public signup exists. This bootstrap path is a CLI-only operational tool. It is not a public route and it does not run during build, deployment, or normal app startup.

## What It Creates

`npm run bootstrap:admin` can create or reuse:

- A `Tenant` identified by a deterministic slug derived from `BOOTSTRAP_TENANT_NAME`.
- A `User` identified by normalized `BOOTSTRAP_OWNER_EMAIL`.
- One active `OWNER` `Membership` for that user and tenant.
- The tenant setup state, marked as `BOOTSTRAPPED`.
- Safe audit records for bootstrap started, owner membership bootstrapped, and bootstrap completed.

Audit metadata uses internal IDs, statuses, and created/reused flags only. It does not include setup secrets, raw tokens, clinic contact details, owner names, or owner email addresses.

## Required Variables

Use placeholders in local files and real values only through local shell variables, staging secret management, or production secret management:

```bash
SETUP_BOOTSTRAP_SECRET="replace-with-local-or-staging-setup-secret"
BOOTSTRAP_SECRET="same-secret-at-runtime"
BOOTSTRAP_TENANT_NAME="Klinika360 Demo Clinic"
BOOTSTRAP_OWNER_EMAIL="owner@example.test"
BOOTSTRAP_OWNER_NAME="Demo Owner"
```

`SETUP_BOOTSTRAP_SECRET` is the configured guard. `BOOTSTRAP_SECRET` is the runtime proof. They must match unless `NODE_ENV="development"` and `BOOTSTRAP_ALLOW_INSECURE_LOCAL="true"` are explicitly set. The insecure local flag is for disposable developer databases only.

Remove or rotate `SETUP_BOOTSTRAP_SECRET` after the first real environment bootstrap.

## Local Usage

Start the local database and apply migrations first:

```bash
npm run dev:db
npm run db:migrate
```

Git Bash:

```bash
SETUP_BOOTSTRAP_SECRET="local-dev-secret" \
BOOTSTRAP_SECRET="local-dev-secret" \
BOOTSTRAP_TENANT_NAME="Klinika360 Demo Clinic" \
BOOTSTRAP_OWNER_EMAIL="owner@example.test" \
BOOTSTRAP_OWNER_NAME="Demo Owner" \
npm run bootstrap:admin
```

PowerShell:

```powershell
$env:SETUP_BOOTSTRAP_SECRET="local-dev-secret"
$env:BOOTSTRAP_SECRET="local-dev-secret"
$env:BOOTSTRAP_TENANT_NAME="Klinika360 Demo Clinic"
$env:BOOTSTRAP_OWNER_EMAIL="owner@example.test"
$env:BOOTSTRAP_OWNER_NAME="Demo Owner"
npm run bootstrap:admin
Remove-Item Env:\BOOTSTRAP_SECRET
```

The CLI also accepts explicit arguments:

```bash
npm run bootstrap:admin -- --tenant-name "Klinika360 Demo Clinic" --owner-email "owner@example.test" --owner-name "Demo Owner" --bootstrap-secret "local-dev-secret"
```

Prefer environment variables or a secret manager over putting secrets in shell history.

## Staging Usage

For staging, set `DATABASE_URL`, `SETUP_BOOTSTRAP_SECRET`, and the bootstrap clinic/owner variables in the deployment or job environment. Provide `BOOTSTRAP_SECRET` only to the one-off job invocation. After the bootstrap succeeds, remove or rotate the setup secret.

Run validation without a database:

```bash
npm run bootstrap:validate
```

Then run the one-off bootstrap command from a trusted operator shell or deployment job that has access to the staging database.

## Production Warning

Production must fail closed if bootstrap is not configured. Do not expose this as a route, server action, or public signup flow. Use production secret management for `SETUP_BOOTSTRAP_SECRET`, provide `BOOTSTRAP_SECRET` only for the controlled one-off run, and remove or rotate the setup secret immediately after use.

Do not run bootstrap against an unknown database. Confirm the target environment and database connection before execution.

## Idempotency

The bootstrap is idempotent for the same derived tenant slug and normalized owner email:

- Existing tenant with the same slug and clinic name is reused.
- Existing user with the same email is reused.
- Existing active owner membership for the same tenant and user is reused.
- Existing deactivated owner membership for the same tenant and user is reactivated.

The bootstrap refuses to continue if the tenant already has a different active owner or if the target user already has a non-owner membership in that tenant. That keeps first-owner creation deliberate and avoids silent privilege changes.

## Google OAuth Relationship

Google OAuth identifies the signed-in user by provider email. It does not create tenants or memberships. After bootstrap, the owner signs in with Google using the same email as `BOOTSTRAP_OWNER_EMAIL`; the auth boundary maps that email to the provisioned `User`, resolves the active `Membership`, and grants the `OWNER` role for the bootstrapped tenant.

## Difference From Seed Data

`npm run db:seed` creates deterministic fake demo tenants, users, patients, and workflow data for local development. It is not for real clinics.

`npm run bootstrap:admin` creates the minimum real operational foundation for one clinic: tenant, owner user, owner membership, setup state, and audit records. It does not create fake patients, appointments, campaigns, invitations, or delivery data.

## Not Implemented

- Public self-service signup.
- Complex onboarding wizard.
- Staff invitation email delivery.
- Password auth, SSO/SAML, or Auth.js Prisma adapter persistence.
- SMS, email, WhatsApp, payment, or AI provider calls.
