# ADR-004: Policy-As-Code And OPA Later

## Status

Planned

## Context

Enterprise tenants may require richer policy rules for role access, regional controls, support access, exports, and sensitive workflow approvals. OPA is a strong candidate, but it is unnecessary before production auth and RBAC exist.

## Decision

Create a local policy engine interface now. Keep initial decisions simple and fail closed. Consider OPA later when policy complexity exceeds local TypeScript rules.

## Consequences

- Authorization-sensitive code can call a single policy abstraction.
- Future OPA integration does not require scattering policy calls through product modules.
- The current MVP avoids a policy service dependency.

## What Is Implemented Now

- `src/server/policy` defines actions, resources, decisions, engine interface, and a conservative local engine.

## What Is Intentionally Deferred

- OPA runtime.
- Rego policies.
- Remote policy decision logs.
- Cross-tenant support access policy.
- Complex enterprise approval policies.
