# Klinika360 Security Baseline

Klinika360 handles sensitive clinic and patient operations. Build with privacy and tenant isolation as default product behavior.

The application security target is OWASP ASVS Level 2. This is a design target, not a compliance claim.

## Secret Handling

- Keep real secrets out of Git.
- Use `.env.example` for placeholders only.
- Copy `.env.example` to `.env.local` for local development and keep `.env.local` untracked.
- Do not print or paste `.env` values in logs, issues, commits, or chat.
- Rotate any secret that is accidentally committed or exposed.
- Use least-privilege provider keys when integrations are introduced.
- First clinic admin bootstrap must remain CLI-only, require a matching setup secret, and never expose a production route or public signup path.
- Remove or rotate `SETUP_BOOTSTRAP_SECRET` after the controlled bootstrap run.

## PII Logging Rules

- Do not log patient names, email addresses, phone numbers, treatment details, free-text notes, or message bodies.
- Use stable internal IDs in logs when needed.
- Redact request payloads by default.
- Keep audit logs structured and intentional; they are not debugging dumps.

## Tenant Isolation Rules

- MVP tenancy is shared app plus shared PostgreSQL with `tenantId` on tenant-owned tables.
- Tenant-owned tables include `tenantId`.
- Data access must filter by tenant context.
- Patient import, recall review, notification preparation, jobs, and audit events all require tenant context.
- Client-supplied tenant IDs require server-side membership checks.
- Background jobs, events, and notifications must include tenant context.
- Cross-tenant support access requires explicit authorization and audit logging.
- Next isolation step is PostgreSQL Row-Level Security. Schema-per-tenant and database-per-tenant are later tier options, not current implementation.

## Auth and RBAC Baseline

- Private routes require authentication and tenant context through `src/server/auth`.
- NextAuth is wired with Google OAuth as the first real provider path when provider credentials are configured.
- Development demo auth is deterministic and only active outside production when `DEMO_AUTH_ENABLED="true"`.
- Production ignores demo auth and fails closed when no real provider/session exists.
- Local demo seed data must match the deterministic demo user and memberships without weakening production auth.
- Users access tenant data through memberships.
- OAuth sessions map by email to an existing `User`; tenant access requires a matching `Membership`.
- Active tenant selection is stored as a cookie but revalidated against membership records on every request.
- Supported roles are owner, admin, doctor, receptionist, manager, and staff. `CLINICIAN` remains only as a legacy compatibility alias.
- Check permissions before sensitive reads, imports, exports, message sends, campaign preparation, settings changes, audit reads, user management, or billing reads.
- Patient import persistence requires `patient:import`.
- Patient lists require `patient:read`.
- Recall review requires `recall:read`; campaign preparation requires `campaign:prepare`.
- Session and tenant switching should be auditable when implemented.
- Staff invitations store token hashes only. Raw invitation tokens must never be logged, audited, or persisted.
- Invitation acceptance hashes raw tokens server-side, uses timing-safe token verification, never exposes token hashes to the client, and never trusts tenant IDs or roles from the client.
- Invitation acceptance requires an authenticated user whose email matches the invited email. Mismatch, expired, revoked, already accepted, invalid, and Owner-role invitations fail safely.
- Invitation acceptance audit metadata must contain statuses, roles, IDs, booleans, or reasons only; it must not contain raw tokens, token hashes, raw email addresses, sessions, or provider payloads.
- Role changes and deactivation must preserve at least one active owner for every tenant.
- The first clinic admin bootstrap creates or reuses one owner membership only when the tenant has no different active owner; it refuses ambiguous owner state instead of silently changing roles.

## Audit Log Strategy

Audit records should capture:

- Tenant ID.
- Actor user ID when available.
- Action name.
- Target entity type and ID.
- Timestamp.
- Minimal metadata without PII.

Audit logs should cover authentication-sensitive actions, membership changes, exports, notification sends, AI-assisted actions, and billing events.

Patient import audit metadata must use counts and identifiers only, such as row counts, valid row counts, invalid row counts, and import batch IDs. Do not store raw names, emails, phone numbers, notes, message bodies, or CSV content in audit metadata.

Admin bootstrap audit metadata must use tenant IDs, user IDs, membership IDs, statuses, and created/reused flags only. It must not include setup secrets, owner email addresses, owner names, raw environment values, sessions, provider payloads, or database connection strings.

Import persistence must store only normalized patient records and import counts. Raw pasted CSV is never stored.

## Local Database Runtime

- `docker-compose.yml` is for local PostgreSQL only and contains no production credentials.
- Seed data must be synthetic, clearly fake, and safe for screenshots or demos.
- The seed script may create patient-shaped records for local workflows, but it must not use real clinic, staff, or patient data.
- Pending invitation seed records must persist only `tokenHash`; raw invitation tokens must not appear in logs, docs, or committed seed data.
- Seed audit metadata should contain counts, statuses, booleans, and IDs only.

## Dependency And Repository Security

- GitHub CI should run lint, typecheck, formatting checks, Prisma validation, build, and high-severity dependency audit.
- CodeQL, Semgrep, and secret scanning are configured as baseline workflows.
- Dependabot should open weekly grouped updates for npm and GitHub Actions.
- Branch protection should require CI, review, and security-sensitive owner review before production use.

## Data Retention Notes

- Define retention policies before storing large volumes of patient communications.
- Provide deletion and export paths appropriate for clinic agreements.
- Keep message content retention limited to what the product needs.
- Avoid storing third-party payloads wholesale.
- Tenant offboarding must eventually support export and deletion or anonymization according to retention policy.
- Do not move tenant data across regions without explicit product, legal, and security decisions.

## Data Residency Planning

- EU tenants should remain in EU regions in production.
- Future US and AU regions should have separate infrastructure boundaries.
- Region assignment should be part of tenant onboarding and observability labeling.
- Do not claim GDPR, HIPAA, or other compliance until proper legal and security review is complete.

## Healthcare and Dental Caution

DentalOS should not make diagnosis, treatment, or clinical necessity claims. Product copy and AI workflows should stay focused on operations unless there is a reviewed clinical and regulatory path.

## AI Output Caution

- AI drafts are not authoritative.
- Validate AI outputs against deterministic business rules.
- Require human approval for patient-facing messages until policy says otherwise.
- Do not send sensitive patient data to AI providers without explicit approval, documentation, and contractual review.
- Do not paste real secrets or real patient data into AI coding tools.
- Turn off model-training usage where applicable for personal AI coding tools.
- Use private repositories while pre-launch when possible.
- Review AI-generated code before merging, especially for auth, tenant isolation, PII, payment, AI, and medical workflows.

## Intentionally Not Implemented Yet

- Staff invitation email delivery, password auth, SSO/SAML, and Auth.js Prisma adapter persistence.
- Real SMS, email, WhatsApp, or phone integrations.
- Payment processing.
- Real OpenAI or other AI provider calls.
- Dedicated single-tenant deployments.
- Medical diagnosis or treatment recommendation features.
