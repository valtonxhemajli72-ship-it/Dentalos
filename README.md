# DentalOS

DentalOS is a multi-tenant SaaS platform for dental clinics. The long-term vision is a clinic operating system, starting with a focused wedge product for patient recall, appointment reminders, follow-up automation, no-show reduction, and patient reactivation.

The first version should help a clinic consistently bring patients back into care without adding more manual work to the front desk.

## Initial Wedge

- Recall campaigns for patients due or overdue for care.
- Appointment reminders that reduce avoidable no-shows.
- Post-visit follow-up workflows.
- Patient reactivation lists for dormant patients.
- Clinic activity views for operational follow-through.

## Long-Term Modules

- Patients
- Appointments
- Documents
- Billing
- Notifications
- Reports
- AI orchestration
- Integrations

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prettier
- Prisma schema prepared for PostgreSQL
- npm for package management in this repository

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` for local development and replace placeholders with local values only. Do not commit real secrets.

Required later for database-backed work:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

Optional integration placeholders:

- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## Scripts

- `npm run dev` - start the Next.js dev server.
- `npm run build` - create a production build.
- `npm run lint` - run ESLint.
- `npm run typecheck` - generate Next.js route types and run TypeScript without emitting files.
- `npm run format` - format the repository with Prettier.
- `npm run format:check` - check formatting.
- `npm run db:validate` - validate the Prisma schema.

## Architecture Overview

DentalOS is a modular monolith first. Product UI, application logic, domain modules, data access, events/jobs, and AI orchestration should remain separated even while they deploy as one application.

Every tenant-owned record must be modeled with tenant context. Private routes must require authentication and tenant resolution before data access. AI is an assistant layer that suggests drafts or actions; the system remains the source of truth.

See:

- `docs/architecture.md`
- `docs/product-strategy.md`
- `docs/security.md`

## Git Workflow

- Work on short-lived feature branches.
- Keep commits focused and reviewable.
- Do not commit `.env`, secrets, generated caches, local databases, or build output.
- Run lint, typecheck, build, and Prisma validation before opening a pull request when practical.

## Security Notes

- Never expose secrets in code, logs, screenshots, issues, or pull requests.
- Do not log patient PII.
- Validate inputs at system boundaries.
- Fail safely when tenant, permission, or validation context is missing.
- Treat healthcare and dental data with heightened privacy expectations.

## MVP Roadmap

1. Add authentication and tenant membership.
2. Build patient import and manual patient management.
3. Create recall campaign segments.
4. Add appointment reminder workflows.
5. Add notification delivery adapters behind safe interfaces.
6. Add audit logs and operational reporting.
7. Pilot with a small clinic and measure workflow completion, not medical outcomes.
