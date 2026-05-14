---
name: pii-and-audit-review
description: Review DentalOS logs, audit metadata, telemetry, imports, invitations, and workflow payloads for PII, secrets, token safety, and safe audit event structure.
---

# PII And Audit Review

Use this skill for audit logs, application logs, telemetry, patient import, invitations, notification preparation, AI-related prompts, and any workflow payload that may touch sensitive clinic data.

## Never Store Or Emit

- Patient names in logs, metrics, audit metadata, telemetry, or AI prompts.
- Patient email addresses or phone numbers in logs, metrics, audit metadata, telemetry, or AI prompts.
- Treatment details, free-text notes, message bodies, or raw CSV content.
- Raw invitation tokens.
- Auth tokens, sessions, cookies, refresh tokens, passwords, API keys, connection strings, or private certificates.
- Provider payloads copied wholesale from OAuth, email, SMS, WhatsApp, payment, or AI systems.

## Safe Metadata Pattern

Audit metadata should use counts, statuses, IDs, and flags only. Prefer:

- Row counts, valid counts, invalid counts, duplicate counts.
- Batch IDs, entity IDs, campaign IDs, membership IDs, invitation IDs.
- Status values such as `created`, `revoked`, `failed`, or `skipped`.
- Boolean flags such as `databaseConfigured` or `duplicatesSkipped`.
- Error categories that do not expose payloads.

## Audit Event Shape

Audit events should include:

- `tenantId`.
- `actorUserId` where available.
- `action`.
- `entityType`.
- `entityId`.
- Safe metadata.
- Timestamp from the persistence layer or trusted server path.

Cross-tenant admin workflows require explicit authorization and audit logs.

## Utilities

Use existing privacy helpers when available, such as `maskEmail`, `maskPhone`, or `redactPII`. Masking is for UI previews and safe diagnostics; it is not permission bypass and does not make raw payload dumps acceptable.

## Import And Invitation Checklist

- Patient imports must not store raw pasted CSV.
- `PatientImportBatch` records store counts and status only.
- Duplicate checks must be tenant-scoped.
- Invalid rows and duplicates should be skipped conservatively.
- Staff invitations store only `tokenHash`.
- Raw invitation tokens may be shown once to an authorized workflow if needed, but never logged, audited, or persisted.

## Review Procedure

Search changed code for `console`, logger calls, audit metadata, telemetry attributes, event payloads, workflow payloads, request body dumps, and error serialization. Check tests and docs for fake patient data only. Report any PII or secret exposure as a blocking issue.
