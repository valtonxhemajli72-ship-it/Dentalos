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

Production backups, restore testing, PITR, data residency, and tenant offboarding procedures are future operational requirements. Do not claim compliance until legal, security, and operational review are complete.
