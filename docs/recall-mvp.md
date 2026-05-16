# Klinika360 Recall MVP

The recall MVP adds the first operational wedge inside DentalOS: a prioritized queue for patients who are due, overdue, already scheduled, or not ready for outreach.

## What Exists Now

- A deterministic recall scoring module in `src/modules/patients/recall.ts`.
- A demo-data adapter in `src/modules/patients/recall-demo-data.ts`.
- A recall workspace route at `/dashboard/recall`.
- Prisma fields for recall due dates, preferred recall channel, last recall contact, and opt-out tracking.
- Import readiness indicators from the tenant-scoped patient import persistence flow.
- Database-backed recall candidates when `DATABASE_URL` is configured, with demo fallback for local unavailable database scenarios.
- A recall campaign builder route at `/dashboard/recall/campaigns/new` that saves tenant-owned campaign drafts when the database is configured.
- Campaign draft persistence through `RecallCampaign` and `RecallCampaignPatient`, with selected patients revalidated against the active tenant before write.

The UI uses masked patient labels and does not send messages. That is intentional until authentication, tenant resolution, approval flows, workers, and notification provider adapters exist.

## Product Rules

- Overdue patients rank above due-soon patients.
- Patients with an upcoming appointment move to confirmation work, not recall outreach.
- Patients who recently received outreach get a gentler follow-up recommendation.
- Patients who opted out or are inactive are not eligible for automated outreach.
- Phone-preferred overdue patients are routed to manual review.
- Campaign builder channels are placeholders for SMS, email, WhatsApp, and manual calls; they do not trigger outbound delivery.
- Audit metadata for campaign drafts stores counts, status, channel, and campaign IDs only.

## Next Implementation Steps

1. Add campaign approval and review states on top of the no-send draft foundation.
2. Add safe message editing rules that avoid patient PII in audit metadata.
3. Add worker-backed preparation for large audiences.
4. Add notification provider adapters only after approval workflows are in place.
5. Add delivery audit events and operational dashboards without message bodies or patient contact details.
