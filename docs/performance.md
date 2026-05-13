# Klinika360 Performance Baseline

Klinika360 should stay fast for front-desk and clinical operations. The MVP should prioritize a responsive dashboard, quick patient import preview, and low-friction recall review.

## Targets

- Core Web Vitals as the product performance baseline.
- Fast server-rendered dashboard navigation.
- Minimal JavaScript for pages that do not need client state.
- No heavy animation, charting, analytics, or UI libraries without a measured need.
- Builds must pass without live database access or real integration secrets.

## Engineering Rules

- Prefer server components by default.
- Use client components only for interactive workflows such as the CSV import preview.
- Keep data queries scoped, paginated, and tenant-aware.
- Avoid large dependency additions for small UI conveniences.
- Do not add third-party analytics scripts until privacy, consent, and performance tradeoffs are reviewed.
- Keep empty, loading, and error states clear.

## Future Automation

Add Lighthouse CI after there is a stable deployed preview URL. Suggested initial budgets:

- Keep total JavaScript small for dashboard pages.
- Track Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift.
- Fail only on serious regressions at first, then tighten thresholds as the product stabilizes.

## Local Review

Before merging substantial UI work, run:

```bash
npm run build
```

Then check the route output and client bundle warnings. Large client bundles need an explicit reason in the pull request.
