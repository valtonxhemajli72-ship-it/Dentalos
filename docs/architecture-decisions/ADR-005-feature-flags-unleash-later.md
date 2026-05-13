# ADR-005: Feature Flags And Unleash Later

## Status

Planned

## Context

Klinika360 will need tenant-tier gates, pilot controls, staged rollouts, and gradual releases. Unleash may be useful later. The MVP does not need a feature flag service.

## Decision

Use a static feature flag client interface now. Introduce Unleash or a similar service later behind that interface.

## Consequences

- Product code can be written against stable flag APIs.
- Flags do not become authorization.
- The MVP remains dependency-light.

## What Is Implemented Now

- `src/server/feature-flags` defines flag keys, context, client interface, and static client.

## What Is Intentionally Deferred

- Unleash server or SDK.
- Remote flag evaluation.
- Tenant-tier flag automation.
- Experimentation framework.
