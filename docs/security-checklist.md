# Klinika360 Security Checklist

Use this checklist during implementation and pull request review.

## Application Security

- Target OWASP ASVS Level 2 for authentication, session handling, access control, validation, logging, dependency security, and secure configuration.
- Validate all untrusted inputs before domain logic.
- Fail closed when auth, tenant, permission, or validation context is missing.
- Do not add production auth bypasses.
- Do not make fake security, compliance, or healthcare claims.

## Tenant Isolation

- Tenant-owned models include `Patient`, `Appointment`, `RecallCampaign`, `NotificationMessage`, `PatientImportBatch`, and `AuditLog`.
- Every tenant-owned query and write requires `tenantId`.
- Repository names should make tenant scope obvious.
- Duplicate checks, imports, recalls, notifications, events, jobs, and audit logs must stay tenant-scoped.
- Cross-tenant support access needs explicit authorization and audit logging before it exists.

## PII And Logging

- No patient names, emails, phones, notes, message contents, treatment details, or raw CSV in logs.
- Audit metadata must use counts, IDs, statuses, and non-sensitive flags only.
- Use masking utilities for operational UI when contact data is relevant.
- Redact request payloads by default in diagnostics.

## Secrets

- Never commit `.env`, `.env.local`, tokens, API keys, passwords, connection strings, or private certificates.
- Use `.env.example` for placeholders only.
- Rotate any accidentally exposed secret.
- Do not paste secrets into AI coding tools, issues, pull requests, or screenshots.

## Dependencies And CI

- Do not add unnecessary dependencies.
- Dependabot is configured for npm and GitHub Actions.
- CI should run lint, typecheck, format check, Prisma validation, build, and high-severity audit.
- CodeQL, Semgrep, and secret scanning workflows are configured as baseline review gates.

## Patient Import

- Require tenant context before persistence.
- Do not store raw CSV.
- Do not store invalid row raw content.
- Check duplicates within the current tenant only.
- Store `PatientImportBatch` counts and status only.
- Write audit events with counts only.

## AI Coding Tool Privacy

- Do not paste real patient data into AI tools.
- Do not paste real secrets into AI tools.
- Disable model-training usage for personal AI coding tools where applicable.
- Keep repositories private while pre-launch when possible.
- Review generated code before merging, especially for auth, tenant isolation, PII, payment, AI, and medical workflows.
