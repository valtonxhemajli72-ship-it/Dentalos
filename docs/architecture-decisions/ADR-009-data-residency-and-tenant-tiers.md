# ADR-009: Data Residency And Tenant Tiers

## Status

Planned

## Context

Dental clinics may need regional hosting, especially in the EU. Future US and AU regions should have infrastructure boundaries. Larger tenants may require stronger isolation tiers.

## Decision

Plan for data residency by tenant region. EU tenants should remain in EU regions in production. Future US and AU tenants should use separate infrastructure boundaries. Tenant isolation tiers should progress from shared schema with RLS to schema-per-tenant and database-per-tenant only when needed.

## Consequences

- Region assignment becomes part of tenant onboarding.
- Cross-region movement requires explicit product, legal, and security decisions.
- Compliance claims must wait for formal review.

## What Is Implemented Now

- Documentation for the staged tenancy and data residency plan.
- Tenant context is explicit in application code.

## What Is Intentionally Deferred

- Regional deployments.
- Automated tenant region routing.
- Data residency enforcement.
- Schema-per-tenant and database-per-tenant.
- GDPR, HIPAA, or other compliance claims.
