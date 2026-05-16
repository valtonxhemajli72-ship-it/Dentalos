# Backend Boundary Checklist

Use this checklist when a PR adds or changes backend behavior, server actions, repositories, jobs, events, observability, imports, notifications, campaigns, reports, or integrations.

## Placement

- Does this code belong in the Next.js web/BFF layer, a domain module, a repository, a worker/job, or an external service adapter?
- Is business logic kept out of React components and page components?
- Does the web layer only orchestrate auth, tenant resolution, permission checks, validation, and domain calls?
- Does an integration go through a `src/server` interface instead of direct provider calls from product modules?

## Tenant And Data Safety

- Does the operation require tenant context?
- Is every tenant-owned read, write, update, delete, list, import, export, event, and job scoped by `tenantId`?
- Are repository names tenant-explicit, such as `listPatientsForTenant`?
- Are client-supplied tenant IDs revalidated against membership and permission checks?
- Does audit metadata contain counts, statuses, IDs, and flags only?
- Are demo fallbacks restricted to explicit local development demo auth, with production using an unavailable state or failing closed?

## Request Lifecycle

- Does this run inside a request or server action?
- Could it become long-running as usage grows?
- Could it process many patients, appointments, imports, notifications, reports, or tenant records?
- Should it instead enqueue a job or start a workflow?
- Does it need progress tracking, retry, backoff, rate limiting, or cancellation?

## Queue And Worker Signals

- Does the work need retry logic?
- Does the work need delayed execution or scheduling?
- Does it need queueing to protect user-facing latency?
- Does it need idempotency keys?
- Does it need distributed locking or tenant-level serialization?
- Would Redis or a queue be justified by this workload, or should the interface remain no-op for now?
- If it uses `src/server/jobs`, does the payload include `tenantId`, an idempotency key, and only safe IDs/counts/statuses/flags?
- Does job metadata avoid raw CSV, patient contact data, message bodies, invitation tokens, token hashes, auth tokens, cookies, provider payloads, and secrets?

## Database Access

- Does it access the database directly?
- Is database access inside a tenant-scoped repository or server-only infrastructure boundary?
- Are queries bounded with pagination, `take`, date windows, or status filters?
- Are tenant-scoped indexes needed?
- Do tenant-scoped updates and revocations include `tenantId` in the mutation filter, not only in a prior read?
- If this adds a relationship between tenant-owned tables, could the child row's `tenantId` mismatch the parent row's `tenantId` without a composite tenant constraint?
- Are future RLS assumptions documented when adding raw SQL, custom transactions, or connection-level database settings?
- Could this increase PostgreSQL connection pressure enough to require PgBouncer planning?

## Observability

- Does the feature need metrics, logs, audit events, or traces?
- Are metric labels low-cardinality and free of PII?
- Do logs avoid patient names, emails, phones, notes, message bodies, raw CSV, provider payloads, tokens, and secrets?
- Are job failures visible without exposing sensitive payloads?
- Are audit logs separate from operational logs?

## Scale Assumptions

- Does this change alter the assumption of about 300 clinics with 8-hour daily usage?
- Does it add bursty workload, provider dependency, or heavy report/export behavior?
- Does it require a new ADR before introducing Redis, queues, workers, a dedicated API, or a new backend framework?
- Are known limitations documented honestly?
