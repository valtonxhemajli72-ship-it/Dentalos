---
name: release-readiness
description: Prepare DentalOS changes for PR or pilot release by checking branch cleanliness, secrets, artifacts, docs, validation commands, rollback notes, and known limitations.
---

# Release Readiness

Use this skill before opening a PR, handing off a major change, or preparing a pilot release.

## Branch And Diff

- Confirm the branch is focused and based on current `main`.
- Confirm `git status` is clean before final handoff, except for intentional uncommitted work during review.
- Review `git diff --stat` and changed filenames.
- Ensure only intended files changed.
- Do not overwrite user changes.
- Do not force push.

## Repository Hygiene

- No `.env` files tracked.
- No real secrets, tokens, private certificates, passwords, or connection strings.
- No real patient data.
- No `node_modules`, `.next`, build output, generated caches, local databases, screenshots with sensitive data, or temporary artifacts.
- No runtime dependencies added unless explicitly needed and reviewed.

## Validation Commands

Run these before handoff when practical:

```bash
npm run format
npm run lint
npm run typecheck
npm run format:check
npm run db:validate
npm run build
npm audit --audit-level=high
```

Run `npm run auth:validate` if it exists. If Prisma schema changed, also run:

```bash
npx prisma format
npx prisma generate
```

Do not run migrations unless explicitly requested.

## Smoke Testing

- Smoke test important local pages when practical.
- Check dashboard unauthorized, empty, loading, and error states for UI changes.
- Check keyboard access for changed workflows.
- Confirm build does not require a live database.

## Documentation And Release Notes

- Update docs for behavior, security rules, operational limitations, or new workflows.
- List known limitations honestly.
- Add rollback notes for risky changes.
- Do not claim compliance, security certification, revenue impact, SLA, or medical outcomes without review.

## Pilot Readiness

- Confirm authentication and tenant membership are configured for pilot users.
- Confirm no real SMS, email, WhatsApp, payment, or AI integrations are implied unless implemented.
- Confirm support staff know what is intentionally not implemented.
- Confirm audit and logging paths do not contain PII.

## Final Output

Summarize branch, commit, checks, audit result, known limitations, and next recommended task.
