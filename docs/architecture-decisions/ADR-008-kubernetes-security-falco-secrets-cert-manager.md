# ADR-008: Kubernetes Security, Secrets, And Certificates Later

## Status

Planned

## Context

Kubernetes may become the production platform later. If it does, runtime security, TLS automation, and secret delivery need strong defaults. Falco, cert-manager, and External Secrets Operator are likely candidates.

## Decision

Do not add Kubernetes manifests or operators now. Document the intended future stack and keep application code independent of Kubernetes-specific assumptions.

## Consequences

- The repository does not imply an active Kubernetes deployment.
- Future platform work can introduce operators with clear review.
- Secrets remain outside Git.

## What Is Implemented Now

- Security documentation and GitHub secret scanning.
- Next.js security headers.
- No active Kubernetes files.

## What Is Intentionally Deferred

- Falco.
- cert-manager.
- External Secrets Operator.
- Kubernetes manifests.
- Runtime security rules.
- Cluster-level secret synchronization.
