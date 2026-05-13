# Patient Import Workflow

The patient import workflow is designed for clinic onboarding into recall automation. It accepts pasted CSV text, validates the rows, masks contact details in the preview, and prepares patient drafts for future tenant-scoped persistence.

## MVP Tenancy Rules

- Shared app.
- Shared PostgreSQL database.
- `tenantId` on tenant-owned records.
- Import batches require `tenantId`.
- Repository functions must require tenant context.
- Raw CSV content is not stored in `PatientImportBatch`.

## Supported Columns

- `firstName`
- `lastName`
- `email`
- `phone`
- `lastVisitDate`
- `nextAppointmentDate`
- `preferredContactChannel`
- `notes`

Dates use `YYYY-MM-DD`. Preferred contact channel supports `email`, `sms`, and `phone`.

## Validation

The import module catches empty rows, missing names, invalid emails, invalid dates, duplicate emails, duplicate phone numbers, and unsupported contact channels.

## Current Limitations

- The dashboard import page previews data only.
- Real auth is not implemented yet.
- Database writes from the UI are not implemented yet.
- Real SMS, email, WhatsApp, payment, and AI calls are not implemented.
- Audit helpers exist, but persistence is not wired to a live request flow yet.
