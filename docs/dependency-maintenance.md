# Dependency Maintenance

Klinika360 keeps dependency updates active, but major upgrades are treated as planned engineering work rather than automatic merges.

## Current Review

Reviewed Dependabot updates on 2026-05-14:

- GitHub Actions updates for `actions/setup-node`, `actions/checkout`, and `github/codeql-action` passed CI and are safe to merge when repository permissions allow.
- Prisma 7 is not safe to merge yet. `prisma generate` fails because Prisma 7 removes datasource `url` support from `schema.prisma` and requires a `prisma.config.ts` and updated client connection setup.
- Tailwind CSS 4 is not safe to merge yet. The build fails because Tailwind 4 requires the new `@tailwindcss/postcss` PostCSS integration and a migration from the current Tailwind 3 setup.
- ESLint 10 is not safe to merge yet. The current Next.js ESLint stack still depends on plugin compatibility that fails under ESLint 10.

## Policy

- Patch and minor updates should continue through Dependabot and CI.
- Major Prisma, Tailwind, and ESLint updates should be opened as explicit migration tasks with local validation before merge.
- Security updates remain enabled. Do not disable Dependabot globally or hide major security updates through broad ignore rules.
- Do not add new dependency families unless they solve a clear product, security, or platform problem.

## Required Checks For Risky Updates

Before merging Prisma, Tailwind, ESLint, Next.js, or TypeScript major updates, run:

```bash
npm ci
npx prisma generate
npm run db:validate
npm run lint
npm run typecheck
npm run format:check
npm run build
npm audit --audit-level=high
```

Prisma updates must validate without a live database connection. Tailwind and ESLint updates must keep the local app buildable without new external services or real secrets.
