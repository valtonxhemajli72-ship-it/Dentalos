# Klinika360 Patient Import Workflow

The patient import workflow is designed for clinic onboarding into recall automation. It accepts pasted CSV text, validates the rows, masks contact details in the preview, and saves valid tenant-scoped patient records when a database is configured.

## MVP Tenancy Rules

- Shared app.
- Shared PostgreSQL database.
- `tenantId` on tenant-owned records.
- Import batches require `tenantId`.
- Repository functions must require tenant context.
- Raw CSV content is not stored in `PatientImportBatch`.
- Duplicate checks only compare against patients inside the same tenant.

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

Database persistence also checks for likely duplicates inside the current tenant. MVP duplicate handling is conservative: duplicate rows are skipped and counted rather than merged.

## Persistence

Saving an import creates:

- A `PatientImportBatch` with status and row counts.
- Patient records for valid non-duplicate rows.
- Appointment records for imported next appointment dates when provided.
- Safe audit events with counts only.

The database is required for persistence. The app still builds and previews imports without a live database.

## Current Limitations

- Real auth is not implemented yet.
- Development auth uses a deterministic local Klinika360 tenant and fails safely in production.
- Real SMS, email, WhatsApp, payment, and AI calls are not implemented.
- Complex duplicate merge workflows are not implemented yet.
