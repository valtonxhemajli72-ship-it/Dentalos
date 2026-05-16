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
- A campaign review route at `/dashboard/recall/campaigns/[campaignId]` for draft edits, review submission, approval, and cancellation.
- Campaign draft persistence through `RecallCampaign` and `RecallCampaignPatient`, with selected patients revalidated against the active tenant before write.
- Campaign statuses for the no-send workflow: `DRAFT`, `IN_REVIEW`, `APPROVED`, and `CANCELLED`.

The UI uses masked patient labels and does not send messages. That is intentional until worker boundaries and notification provider adapters exist.

`src/server/jobs` now documents the future `recall_campaign.prepare`, `recall_campaign.validate_audience`, `notification.prepare_batch`, and `notification.dispatch_placeholder` boundaries. The recall UI and server actions do not enqueue real jobs yet.

## Product Rules

- Overdue patients rank above due-soon patients.
- Patients with an upcoming appointment move to confirmation work, not recall outreach.
- Patients who recently received outreach get a gentler follow-up recommendation.
- Patients who opted out or are inactive are not eligible for automated outreach.
- Phone-preferred overdue patients are routed to manual review.
- Campaign builder channels are placeholders for SMS, email, WhatsApp, and manual calls; they do not trigger outbound delivery.
- Only `DRAFT` campaigns can edit the generic message template.
- `IN_REVIEW` and `APPROVED` campaigns lock message editing. Approval records readiness only and does not send.
- Campaign preparation requires `campaign:prepare`; approval requires `campaign:approve`.
- Audit metadata for campaign drafts and approval steps stores counts, status, channel, campaign IDs, and flags only.
- Raw message content, patient names, patient emails, patient phones, and selected patient ID lists do not belong in audit metadata.

## Next Implementation Steps

1. Wire reviewed worker-backed preparation for large audiences through `src/server/jobs`.
2. Add notification provider adapters only after the no-send approval workflow and worker retry model are validated.
3. Add delivery audit events and operational dashboards without message bodies or patient contact details.
4. Add approval return-to-draft or reviewer notes if clinic workflow feedback shows it is needed.
