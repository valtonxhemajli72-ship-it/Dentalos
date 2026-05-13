# ADR-010: Tenant Onboarding And Offboarding

## Status

Planned

## Context

Enterprise readiness requires predictable tenant lifecycle workflows. Onboarding needs tenant creation, memberships, feature flags, monitoring labels, and later welcome flows. Offboarding needs export, deletion or anonymization, access revocation, and audit evidence.

## Decision

Document the lifecycle now and reserve workflow interfaces for future automation. Implement tenant onboarding/offboarding automation later, likely with Temporal when workflows become durable.

## Consequences

- Tenant lifecycle is treated as a first-class platform concern.
- Offboarding is not improvised after customer data exists.
- The MVP does not pretend to support automated deletion certificates.

## What Is Implemented Now

- Local/demo tenant seed behavior.
- Documentation for onboarding and offboarding stages.
- Workflow interface that can later start lifecycle workflows.

## What Is Intentionally Deferred

- Automated tenant onboarding.
- Automated tenant offboarding.
- Data export workflow.
- Deletion/anonymization workflow.
- Deletion or audit certificates.
