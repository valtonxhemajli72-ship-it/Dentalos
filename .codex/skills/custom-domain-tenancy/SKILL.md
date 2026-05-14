---
name: custom-domain-tenancy
description: Guide safe custom-domain tenant access for Klinika360, including verified host resolution, DNS verification, auth callbacks, cookies, branding, and no cross-tenant leakage.
---

# Custom Domain Tenancy

Use this skill before designing or implementing host-based tenant resolution, tenant branding, clinic subdomains, or custom domain onboarding.

## Product Model

- `klinika360.com` is the marketing and company site.
- Client-owned domains and subdomains are tenant access portals.
- The MVP remains shared app and shared PostgreSQL unless a paid enterprise decision explicitly requires dedicated deployment later.
- Custom branding may vary per tenant, but security behavior must not vary by branding.

## TenantDomain Guidance

If a schema change is introduced later, prefer a `TenantDomain` style model with:

- `tenantId`.
- Normalized hostname.
- Status such as pending, verified, disabled, or failed.
- DNS TXT verification token hash or safe verification record metadata.
- Timestamps for requested, verified, disabled, and last checked.
- Unique hostname constraint.
- Indexes that support verified host lookup without cross-tenant ambiguity.

Do not store DNS provider secrets or private keys in the database.

## DNS And HTTPS

- Verify ownership with DNS TXT before routing a host to a tenant.
- Prefer CNAME for client subdomains when possible.
- Apex/root domains may need provider-specific ALIAS/ANAME support.
- Enforce HTTPS in production and plan certificate provisioning through the deployment platform.
- Do not claim dedicated infrastructure or compliance because a tenant has a custom domain.

## Host Resolution Checklist

- Resolve tenants from the `Host` header only after hostname normalization.
- Match only verified, enabled domains.
- Reject unknown, disabled, unverified, malformed, or ambiguous hosts.
- Never trust a tenant ID from query params, headers, forms, local storage, or client state without membership validation.
- Host-based tenant resolution must still validate the authenticated user membership before private data access.
- Cross-tenant support/admin workflows require explicit authorization and audit logging.

## Auth And Redirect Safety

- Validate callback URLs and redirect targets against allowed application hosts.
- Avoid open redirects through `next`, `callbackUrl`, `returnTo`, or tenant-provided URLs.
- Consider cookie domain scope carefully. A client domain should not receive cookies intended for another tenant domain.
- OAuth provider callback configuration must account for approved hosts without accepting arbitrary redirects.
- Sign-out and invitation links must not leak tenant IDs, raw tokens, or patient data.

## Branding Checklist

- Tenant branding must be loaded after tenant resolution and permission checks where private data is involved.
- Public branding pages must not reveal private tenant membership, patient counts, or operational data.
- Error pages for unknown hosts must not disclose whether a tenant exists.
- Email and notification branding later must use verified tenant configuration and safe templates.

## Review Questions

- Can one tenant cause another tenant to render, authenticate, or redirect under the wrong host?
- Can an attacker register a confusing domain or subdomain and capture callbacks?
- Are unknown and unverified domains handled safely?
- Are audit events for domain changes free of PII and secrets?
