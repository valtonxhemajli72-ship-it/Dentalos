# Local Development

Use this flow to run Klinika360 locally with PostgreSQL, Prisma migrations, and fake demo data. DentalOS remains the internal repository name.

## Prerequisites

- Node.js and npm.
- Docker with Docker Compose.
- Git.

## Bootstrap

Install dependencies:

```bash
npm install
```

Copy the local environment example:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Start PostgreSQL:

```bash
docker compose up -d
```

Equivalent package script:

```bash
npm run dev:db
```

Apply Prisma migrations:

```bash
npm run db:migrate
```

Seed fake demo data:

```bash
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/dashboard`

## Demo Auth

`.env.example` enables local demo auth with `DEMO_AUTH_ENABLED="true"`. Demo auth only works when `NODE_ENV` is not `production`; production ignores the flag and still requires real authentication.

The seeded demo owner matches the deterministic local auth user:

- User ID: `user_demo_klinika360_owner`
- Email: `demo-user@example.test`
- Primary tenant: `tenant_demo_klinika360`
- Primary membership: `membership_demo_klinika360_owner`
- Secondary tenant option: `tenant_demo_klinika360_specialists`

Google OAuth can also be tested locally by replacing `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and auth secrets with real local development values. OAuth users must already exist in `User` and have a `Membership`.

## Reset Local Database

This is destructive for the local Docker database only:

```bash
npm run db:reset
npm run db:seed
```

Do not run reset commands against staging or production databases.

## Troubleshooting

If port `5432` is already in use, stop the other local PostgreSQL instance or change the Compose port mapping and `DATABASE_URL` together.

If port `3000` is already in use, run Next.js on another port:

```bash
npm run dev -- --port 3001
```

If Prisma client is missing or stale:

```bash
npm run db:generate
```

If `DATABASE_URL` is missing, confirm `.env.local` exists and contains the local PostgreSQL URL from `.env.example`.

If the dashboard redirects to sign-in, confirm `DEMO_AUTH_ENABLED="true"` is present in `.env.local` and restart the dev server.

If the dashboard shows no tenant membership, rerun:

```bash
npm run db:seed
```

If Docker says the database is still starting, wait for the healthcheck or inspect:

```bash
docker compose ps
```
