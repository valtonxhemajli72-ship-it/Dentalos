# Database Runtime

Klinika360 uses PostgreSQL through Prisma. Local development runs PostgreSQL in Docker Compose with fake demo data only.

## Local PostgreSQL

`docker-compose.yml` defines a local-only PostgreSQL service:

- Database: `klinika360_dev`
- User: `dentalos`
- Password: `dentalos_dev_password`
- Port: `5432`
- Data volume: `dentalos_postgres_data`

These credentials are for local development only and must not be reused outside a developer workstation.

## Prisma Migrations

The repository includes an initial Prisma migration for the current schema. Apply migrations locally with:

```bash
npm run db:migrate
```

Generate Prisma Client when needed:

```bash
npm run db:generate
```

Validate the schema without requiring a live database:

```bash
npm run db:validate
```

Validate the RLS readiness documentation and static schema guardrails without requiring a live database:

```bash
npm run rls:validate
```

## Seed Data

`npm run db:seed` runs `scripts/seed-demo-data.mjs`. The seed creates:

- A primary Klinika360 demo tenant.
- A secondary tenant for tenant switching.
- A deterministic demo owner matching development auth.
- Admin, doctor, receptionist, manager, and staff users.
- Tenant memberships.
- Synthetic patients, appointments, recall campaigns, notification message examples, and import batch records.
- A pending invitation record with only `tokenHash` persisted.
- A safe audit record with counts and IDs only.

Seed data is fake and uses `.test` email addresses plus synthetic phone numbers. Do not replace seed data with real clinic, staff, or patient data.

## First Clinic Admin Bootstrap

`npm run bootstrap:admin` is a separate one-off CLI for creating the minimum real clinic foundation in a controlled database. It creates or reuses one tenant, one owner user, one active `OWNER` membership, marks the tenant setup state as `BOOTSTRAPPED`, and writes safe audit records with IDs, statuses, and created/reused flags only.

The bootstrap requires `SETUP_BOOTSTRAP_SECRET` to match runtime `BOOTSTRAP_SECRET`, unless `NODE_ENV="development"` and `BOOTSTRAP_ALLOW_INSECURE_LOCAL="true"` are explicitly set for a disposable local database. Do not run it against an unknown database, and remove or rotate the setup secret after first use outside local development.

This differs from `npm run db:seed`: seed data is fake workflow data for local demos, while bootstrap is the narrow first-owner provisioning path for a real clinic environment.

## Safety Rules

- Do not commit `.env`, `.env.local`, database dumps, or real credentials.
- Do not seed real patient data.
- Do not log patient names, emails, phones, notes, raw CSV, invitation tokens, token hashes, or auth tokens.
- Tenant-owned seed records must include `tenantId`.
- Demo auth remains development-only and production fail-closed.
- Raw invitation tokens are never stored; the seed stores only a hash for the pending invitation example.

## Local Reset

To rebuild the local database from migrations:

```bash
npm run db:reset
npm run db:seed
```

This is destructive. Confirm `DATABASE_URL` points to the local Docker database before running reset commands.

## Future Environments

Staging and production database setup should use managed PostgreSQL with least-privilege credentials, automated migrations through deployment controls, monitoring, backups, and point-in-time recovery. Connection pooling with PgBouncer or a managed pooler should be introduced when connection pressure grows.

PostgreSQL Row-Level Security is planned but not enabled yet. RLS rollout should first add tenant consistency checks and staging policies, then test Prisma behavior with the intended pooler. Tenant context should be set transaction-locally, for example with `set_config('app.current_tenant_id', tenantId, true)`, so pooled connections cannot retain a previous request's tenant.

Production backups, restore testing, PITR, data residency, and tenant offboarding procedures are future operational requirements. Do not claim compliance until legal, security, and operational review are complete.
