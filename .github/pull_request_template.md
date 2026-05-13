## Summary

-

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run format:check`
- [ ] `npm run db:validate` if Prisma changed
- [ ] `npm run build`

## Security And Privacy Checklist

- [ ] Tenant isolation checked; tenant-owned reads and writes require `tenantId`.
- [ ] No PII in logs, audit metadata, screenshots, or issue references.
- [ ] No secrets, tokens, credentials, or `.env` values included.
- [ ] No production auth bypass added.
- [ ] Inputs are validated at boundaries and fail safely.
- [ ] Import or audit changes do not store raw CSV or raw patient PII.
- [ ] Security-sensitive changes were reviewed with extra care.

## Product Quality Checklist

- [ ] Accessibility considered for keyboard, focus, labels, contrast, and screen readers.
- [ ] Performance considered; no unnecessary client components or large dependencies.
- [ ] No unnecessary dependencies added.
- [ ] No fake medical, compliance, security, or production readiness claims.
- [ ] Real SMS, email, WhatsApp, payment, or AI calls were not added unless explicitly approved.
