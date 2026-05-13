---
name: Security review
about: Request review for auth, tenant isolation, PII, audit, or workflow safety
labels: security
---

## Area

- [ ] Authentication or session handling
- [ ] Tenant isolation
- [ ] Patient import or CSV handling
- [ ] Audit logging
- [ ] PII masking or privacy
- [ ] CI, dependencies, or repository governance
- [ ] Other

## Review Request

## Data Sensitivity

- [ ] Uses fake data only.
- [ ] No patient PII is included.
- [ ] No secrets or `.env` values are included.
- [ ] Audit metadata contains counts, IDs, statuses, or flags only.

## Expected Decision

- [ ] Approve current approach
- [ ] Identify risks before implementation
- [ ] Block merge until fixed
