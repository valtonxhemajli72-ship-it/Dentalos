# Klinika360 Platform Roadmap

Klinika360 is the public product and demo clinic identity. DentalOS is the internal repository and project name.

This roadmap preserves enterprise architecture decisions without installing heavy infrastructure before the product needs it. The MVP remains a modular monolith with clear internal interfaces so future platform services can be introduced deliberately.

## Current MVP Architecture

- Next.js App Router application.
- TypeScript-first modular monolith.
- Shared application and shared PostgreSQL database.
- `tenantId` on tenant-owned models.
- Membership connects users to tenants and roles.
- Tenant-owned queries require tenant context.
- Patient import, patient list, and recall review use tenant-scoped persistence when a database is configured.
- Local/demo mode can fall back safely when database access is unavailable.
- A NextAuth/Auth.js-compatible auth and RBAC boundary exists with Google OAuth as the first real provider path.
- Tenant switching and staff invitation records exist without email delivery.
- Delivery integrations, payments, AI calls, and advanced workflow infrastructure are intentionally not implemented yet.

## Enterprise Architecture Target

The long-term target is still one product platform, not premature microservices. Enterprise services may be introduced behind internal interfaces when operational pressure justifies them:

- Temporal for durable, long-running workflows.
- Debezium for PostgreSQL change data capture.
- ClickHouse for OLAP analytics.
- OPA for policy-as-code.
- Unleash for feature flags.
- OpenMeter for usage-based metering.
- Prometheus and Grafana for metrics, SLA dashboards, and tenant-level observability.
- Falco for Kubernetes/container runtime security.
- cert-manager and External Secrets Operator for Kubernetes TLS and secret delivery.
- PgBouncer for PostgreSQL connection pooling.
- Chaos Mesh for controlled failure testing.

These are planned capabilities, not active dependencies or deployed services.

## What We Implement Now

- Documentation and architecture decision records.
- Dependency-free TypeScript ports under `src/server`.
- No-op or local implementations for workflows, events, policy, feature flags, metering, and observability.
- Clear guidance that product modules must use internal interfaces instead of direct vendor calls.

## What We Implement Later

- Invitation acceptance, email delivery, staff provisioning, and more enterprise auth options on top of the current auth/RBAC boundary.
- PostgreSQL Row-Level Security for shared-schema tenant isolation.
- Durable workflow engine once recall campaigns and onboarding/offboarding workflows become long-running.
- CDC and analytical warehouse once operational reporting exceeds transactional database needs.
- Metrics, dashboards, alerts, and tenant-level SLA views.
- Feature-flag service after release management needs outgrow static flags.
- Usage metering after pricing and billing requirements are known.
- Kubernetes security operators after the deployment platform actually runs on Kubernetes.

## Why We Do Not Install Heavy Infrastructure Yet

The wedge product still needs rapid iteration around patient import, recall review, reminders, and no-show reduction. Installing Temporal, Debezium, ClickHouse, OPA, Unleash, OpenMeter, Falco, Chaos Mesh, cert-manager, External Secrets, Prometheus, or Grafana now would add operational drag before there is enough product signal.

The right compromise is to define stable internal ports now and keep implementations no-op or local. That prevents vendor calls from leaking into product modules while keeping the MVP easy to build and run.

## Backend Scalability Path

Backend scalability should evolve in stages, driven by measured workload and product complexity rather than a premature service split.

Stage 1:

- Next.js modular monolith as the web/BFF layer.
- Prisma and PostgreSQL for tenant-owned persistence.
- Tenant-scoped repositories for every tenant-owned query and write.
- Domain logic in `src/modules`.
- Dependency-free server interfaces in `src/server`.

Stage 2:

- Worker process for background work.
- Queue abstraction before choosing a queue provider.
- Redis for rate limits, low-risk cache, short-lived locks, or queue backend needs when justified.
- Background jobs for imports, campaign preparation, notifications, reports, onboarding, and offboarding.
- PgBouncer or equivalent connection pooling when Next.js and workers create database connection pressure.

Stage 3:

- Dedicated API backend if multiple clients, backend scale, deployment cadence, or team ownership justify it.
- NestJS or Fastify are TypeScript candidates; Go is a candidate for high-concurrency operational services.
- Service boundary extraction follows existing modules, repositories, jobs, events, and workflow interfaces.
- API gateway and load balancing only after an API backend exists and traffic patterns justify them.

Stage 4:

- Enterprise infrastructure such as ALB, WAF, ECS, RDS, ElastiCache, SQS, Grafana, and Prometheus.
- These are planned deployment options, not installed services.
- Any enterprise infrastructure must preserve tenant isolation, no-PII observability, data residency decisions, and reviewed operational runbooks.

## Tenant Isolation Stages

1. MVP: shared schema, shared PostgreSQL database, `tenantId` on tenant-owned rows, and tenant-scoped repositories.
2. Next: PostgreSQL Row-Level Security for defense-in-depth in the shared schema.
3. Later: optional schema-per-tenant for mid-market tenants if data volume, operational support, or contractual needs justify it.
4. Later: optional database-per-tenant for enterprise tenants that pay for stronger isolation or require dedicated operations.

PgBouncer or another connection pooling strategy may be needed as tenant count and server concurrency grow.

## Workflow Roadmap

- Now: synchronous domain logic and no-op workflow client interfaces.
- Next: in-process jobs for short tasks with tenant context and idempotency keys.
- Later: Temporal for durable workflows such as tenant onboarding, tenant offboarding, recall campaign sequences, integration syncs, and deletion/anonymization workflows.

## Eventing, CDC, And Analytics Roadmap

- Now: typed domain event ports and no-op publisher.
- Next: in-process event bus for local side effects.
- Later: durable event publishing and outbox pattern.
- Later: Debezium for PostgreSQL CDC into analytical pipelines.
- Later: ClickHouse for OLAP reporting, cohort analysis, no-show trend analysis, and operational dashboards.

Do not use CDC or analytics pipelines for raw patient PII unless a reviewed privacy and retention design exists.

## Security And Policy Roadmap

- Now: tenant helper functions, NextAuth-backed auth/RBAC boundary, audit metadata checks, security review docs, and local policy interface.
- Next: invitation acceptance, staff provisioning, notification-backed invitation delivery, and PostgreSQL RLS.
- Later: OPA policy-as-code for complex enterprise policies.
- Later: Falco for Kubernetes/container runtime security.
- Later: cert-manager and External Secrets Operator for Kubernetes TLS and secret delivery.
- Later: Chaos Mesh for controlled failure testing after production architecture stabilizes.

## Feature Flags Roadmap

- Now: static, dependency-free feature flag interface.
- Later: Unleash or equivalent flag service for staged rollouts, pilot segmentation, and tenant-tier gates.

Feature flags must not become authorization. Auth and tenant policy remain separate security controls.

## Usage Metering And Billing Roadmap

- Now: no-op usage metering interface.
- Later: OpenMeter or equivalent after pricing, billing, and usage definitions are validated.
- Later: billing integration only after security, audit, and customer support requirements are clear.

No payment processing is implemented now.

## Observability And SLA Monitoring Roadmap

- Now: no-op metric recording helpers with safe label rules.
- Next: structured server logs without PII.
- Later: Prometheus and Grafana for uptime, error rate, latency, job success/failure, and tenant-level dashboards.
- Later: tenant-tier SLA dashboards and alerting.

SLA targets should be measured before being promised. Do not add fake SLA claims to UI or docs.

## Data Residency Plan

- EU tenants should remain in EU infrastructure regions in production.
- Future US and AU regions should have separate infrastructure boundaries.
- Tenant data should not move cross-region without explicit product, legal, and security decisions.
- Region assignment should be part of tenant onboarding and should flow into monitoring labels, backup policy, and data export workflows.

Do not claim GDPR, HIPAA, or other compliance until proper legal and security review is complete.

## Tenant Onboarding Plan

Planned workflow:

1. Create tenant.
2. Create membership and admin user.
3. Assign feature flags.
4. Prepare monitoring labels.
5. Seed safe defaults.
6. Send welcome flow later.

The current MVP only has a deterministic local/demo tenant and manual demo seed script.

## Tenant Offboarding Plan

Planned workflow:

1. Confirm authorization and retention policy.
2. Export tenant data.
3. Delete or anonymize tenant data according to policy.
4. Revoke access, feature flags, and integration credentials.
5. Produce deletion/audit certificate later.

Offboarding is not implemented yet.

## Not Implemented Yet

- Temporal, Kafka, Debezium, ClickHouse, OPA, Unleash, OpenMeter, Falco, Chaos Mesh, cert-manager, External Secrets Operator, Prometheus, or Grafana.
- Kubernetes manifests or active deployment configuration for advanced services.
- PostgreSQL Row-Level Security.
- Schema-per-tenant or database-per-tenant.
- Regional infrastructure boundaries.
- Tenant onboarding/offboarding automation.
- SLA dashboards or promised SLA tiers.
- Redis, queues, workers, a dedicated backend API, or API gateway.
- Real SMS, email, WhatsApp, payment, tenant switching, staff invitation, password auth, SSO/SAML, or OpenAI calls.
