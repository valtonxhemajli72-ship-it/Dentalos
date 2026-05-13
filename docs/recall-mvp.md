# Klinika360 Recall MVP

The recall MVP adds the first operational wedge inside DentalOS: a prioritized queue for patients who are due, overdue, already scheduled, or not ready for outreach.

## What Exists Now

- A deterministic recall scoring module in `src/modules/patients/recall.ts`.
- A demo-data adapter in `src/modules/patients/recall-demo-data.ts`.
- A recall workspace route at `/dashboard/recall`.
- Prisma fields for recall due dates, preferred recall channel, last recall contact, and opt-out tracking.
- Import readiness indicators from the tenant-scoped patient import persistence flow.

The UI uses anonymized demo patient labels and does not send messages. That is intentional until authentication, tenant resolution, approval flows, and notification provider adapters exist.

## Product Rules

- Overdue patients rank above due-soon patients.
- Patients with an upcoming appointment move to confirmation work, not recall outreach.
- Patients who recently received outreach get a gentler follow-up recommendation.
- Patients who opted out or are inactive are not eligible for automated outreach.
- Phone-preferred overdue patients are routed to manual review.

## Next Implementation Steps

1. Add authentication and active tenant resolution.
2. Replace demo data with tenant-scoped Prisma queries.
3. Add server-side validation for recall filters and campaign draft creation.
4. Add audit logs for campaign creation and message approval.
5. Introduce notification provider adapters only after approval workflows are in place.
