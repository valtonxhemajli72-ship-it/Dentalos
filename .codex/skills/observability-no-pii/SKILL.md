---
name: observability-no-pii
description: Design and review DentalOS logs, metrics, Sentry-style error reporting, and future observability integrations so operational signals contain no PII or secrets.
---

# Observability Without PII

Use this skill before adding or reviewing logs, metrics, error reporting, tracing, audit-adjacent events, or observability adapters.

## Core Rule

Operational telemetry must help debug the system without exposing patient PII, secrets, auth tokens, message bodies, free-text notes, raw CSV, or provider payloads.

## Allowed Signal Shapes

- Event type.
- Operation name.
- Status or error category.
- Counts.
- Durations.
- Stable internal IDs when necessary.
- Tenant ID only when intentional, access-controlled, and not exposed publicly.
- Feature flag name or release channel when not sensitive.

## Forbidden In Logs And Metrics

- Patient names, email addresses, phone numbers, treatment details, notes, message bodies, or CSV rows.
- Raw invitation tokens, auth tokens, refresh tokens, sessions, cookies, passwords, API keys, connection strings, or private certificates.
- Provider payload dumps.
- Full request bodies for patient, import, invitation, auth, payment, AI, or notification flows.
- Metric labels with unbounded or sensitive values.

## Sentry And Error Reporting Checklist

- Strip request bodies and sensitive headers.
- Do not attach raw session objects.
- Scrub cookies, authorization headers, tokens, and provider payloads.
- Group errors by safe categories, not patient data.
- Ensure missing DSN or environment config degrades gracefully without crashing the app.
- Do not report fake SLA or compliance status from telemetry.

## Metrics Checklist

- Use low-cardinality labels such as operation, status, route group, or safe tenant tier.
- Avoid labels for patient IDs, email, phone, name, raw tenant domains, message content, or free text.
- Counts and durations are preferred.
- Tenant-level metrics require an explicit privacy and access decision.

## Audit Versus Logs

- Audit logs are intentional product/security records with tenant ID, actor user ID where available, action, entity type, entity ID, timestamp, and safe metadata.
- Application logs are operational diagnostics and should not become audit history.
- Neither audit logs nor application logs may contain PII or secrets.

## Future Integrations

Future OpenTelemetry, Prometheus, Grafana, or Sentry-style integrations must follow the same no-PII rules. Add adapters behind `src/server/observability` when needed; do not install heavy infrastructure until explicitly in scope.
