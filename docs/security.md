# DentalOS Security Baseline

DentalOS handles sensitive clinic and patient operations. Build with privacy and tenant isolation as default product behavior.

## Secret Handling

- Keep real secrets out of Git.
- Use `.env.example` for placeholders only.
- Do not print or paste `.env` values in logs, issues, commits, or chat.
- Rotate any secret that is accidentally committed or exposed.
- Use least-privilege provider keys when integrations are introduced.

## PII Logging Rules

- Do not log patient names, email addresses, phone numbers, treatment details, free-text notes, or message bodies.
- Use stable internal IDs in logs when needed.
- Redact request payloads by default.
- Keep audit logs structured and intentional; they are not debugging dumps.

## Tenant Isolation Rules

- Tenant-owned tables include `tenantId`.
- Data access must filter by tenant context.
- Client-supplied tenant IDs require server-side membership checks.
- Background jobs, events, and notifications must include tenant context.
- Cross-tenant support access requires explicit authorization and audit logging.

## Auth and RBAC Baseline

- Private routes require authentication.
- Users access tenant data through memberships.
- Start with simple roles such as owner, admin, clinician, and staff.
- Check permissions before sensitive reads, exports, message sends, or billing actions.
- Session and tenant switching should be auditable when implemented.

## Audit Log Strategy

Audit records should capture:

- Tenant ID.
- Actor user ID when available.
- Action name.
- Target entity type and ID.
- Timestamp.
- Minimal metadata without PII.

Audit logs should cover authentication-sensitive actions, membership changes, exports, notification sends, AI-assisted actions, and billing events.

## Data Retention Notes

- Define retention policies before storing large volumes of patient communications.
- Provide deletion and export paths appropriate for clinic agreements.
- Keep message content retention limited to what the product needs.
- Avoid storing third-party payloads wholesale.

## Healthcare and Dental Caution

DentalOS should not make diagnosis, treatment, or clinical necessity claims. Product copy and AI workflows should stay focused on operations unless there is a reviewed clinical and regulatory path.

## AI Output Caution

- AI drafts are not authoritative.
- Validate AI outputs against deterministic business rules.
- Require human approval for patient-facing messages until policy says otherwise.
- Do not send sensitive patient data to AI providers without explicit approval, documentation, and contractual review.
