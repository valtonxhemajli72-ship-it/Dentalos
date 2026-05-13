# Klinika360 Accessibility Baseline

Klinika360 should be usable by doctors, receptionists, clinic managers, administrative staff, and other team members across common devices and input methods.

## Target

- WCAG 2.2 AA.
- Keyboard-friendly navigation.
- Visible focus states.
- Semantic HTML for headings, forms, tables, and navigation.
- Adequate text contrast.
- Clear labels for form controls and buttons.
- No icon-only controls without accessible names.

## Product Expectations

- Receptionists must be able to move quickly through import, patient, and recall workflows without mouse-only interactions.
- Doctors need low-friction review screens with readable context.
- Managers need scannable dashboard summaries and clear empty/error states.
- Destructive actions must be explicit, reversible when possible, and never hidden behind ambiguous controls.

## Current Baseline

- Global `:focus-visible` styles are defined.
- CSV import textarea has a visible label.
- Dashboard navigation uses semantic `nav`.
- Tables use readable headers and simple row structure.
- Demo flows avoid hidden message-sending actions.

## Future Automation

Add browser-level accessibility smoke tests after Playwright or a similar test runner is introduced. Suggested checks:

- `/`
- `/dashboard`
- `/dashboard/import`
- `/dashboard/patients`
- `/dashboard/recall`

Use axe-core or an equivalent scanner in CI after the test infrastructure is stable.
