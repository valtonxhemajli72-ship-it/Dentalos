---
name: enterprise-frontend-accessibility
description: Review DentalOS dashboard UI for WCAG 2.2 AA accessibility, enterprise workflow clarity, role-aware states, and performance-conscious client components.
---

# Enterprise Frontend Accessibility

Use this skill before or after changing dashboard UI, forms, tables, settings screens, import flows, recall workflows, or role-specific pages.

## Target

Klinika360 UI should feel serious, fast, and usable for doctors, receptionists, clinic managers, administrative staff, and other clinic team members. The accessibility target is WCAG 2.2 AA.

## Interaction Checklist

- Every workflow must be usable with keyboard navigation.
- Visible focus states must be preserved for links, buttons, form controls, tabs, menus, and table actions.
- Icon-only buttons need accessible names through labels or `aria-label`.
- Buttons must use button semantics, not clickable `div` elements.
- Links must navigate; buttons must perform actions.
- Destructive actions need clear labels, confirmation where appropriate, and safe unauthorized states.

## Semantic HTML Checklist

- Use headings in logical order.
- Use forms, labels, fieldsets, descriptions, and error associations for inputs.
- Tables need headers, captions or surrounding context, and meaningful empty states.
- Lists of repeated operational items should use list or table semantics when appropriate.
- Status badges must not rely on color alone.
- Error messages should identify the field or action and avoid exposing sensitive internals.

## State Checklist

- Loading states must be readable and not cause layout jumps.
- Empty states should be action-oriented without fake claims.
- Error states must avoid leaking tenant data, patient PII, tokens, or implementation details.
- Unauthorized states must be explicit and not expose hidden tenant data.
- No-tenant states must guide the user without implying access.

## Role-Aware Product Language

- Doctors review care context and recall readiness.
- Receptionists manage recall, reminders, imports, and scheduling work.
- Managers monitor operational readiness, no-shows, import status, and team workflows.
- Staff see only role-appropriate actions and data.
- UI copy should say Klinika360 for the public product. DentalOS is internal repo language.

## Performance Checklist

- Prefer server components for read-heavy dashboard views.
- Use client components only when interactivity requires them.
- Avoid heavy UI dependencies unless there is a clear product need.
- Keep tables, forms, and dashboards scan-friendly instead of decorative.
- Preserve Core Web Vitals goals by avoiding large client bundles and unnecessary animation.

## Review Procedure

Inspect the changed route, components, forms, and states. If practical, smoke test at desktop and mobile widths. Report blocking accessibility defects first, then usability and performance risks.
