# ADR-007: Observability With Prometheus And Grafana Later

## Status

Planned

## Context

Klinika360 needs tenant-level reliability visibility before it can promise enterprise SLAs. Prometheus and Grafana are likely future tools, but the current MVP should not deploy observability infrastructure.

## Decision

Create no-op observability helpers now with strict safe-label guidance. Introduce Prometheus, Grafana, and possibly OpenTelemetry later behind internal instrumentation boundaries.

## Consequences

- Product code can record metrics without choosing infrastructure too early.
- PII is kept out of metric labels.
- SLA claims wait until measurements exist.

## What Is Implemented Now

- `src/server/observability` defines safe metric labels and no-op metric functions.
- Documentation defines uptime, error, latency, and job success/failure as future tenant-level signals.

## What Is Intentionally Deferred

- Prometheus.
- Grafana.
- OpenTelemetry collector.
- Tenant-level SLA dashboards.
- Alerting and incident management automation.
