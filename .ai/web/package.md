# package.json

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Package manifest and scripts for the Next.js web app.

## What It Does

- Declares web runtime and dev dependencies.
- Provides scripts for build, dev, start, test, e2e, and TypeScript lint.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `build` | script | Cleans generated Next artifacts and runs `next build`. |
| `dev` | script | Starts Next development server. |
| `start` | script | Starts built production server. |
| `test` | script | Runs unit/property/integration tests. |
| `test:e2e` | script | Runs e2e tests. |
| `lint` | script | Runs `tsc --noEmit`. |

## Dependencies

- **Internal:** `@spinshare/core`.
- **External:** Next.js, React, NextAuth, Firebase Admin, Stripe, Vitest, Tailwind, Recharts.

## Important Notes / NEVER Change

- `next build` must be deterministic after dev/e2e runs.
- The build script may delete only generated `web/.next`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | `next build` intermittently fails after dev-mode e2e with missing `.next` manifests. | `next dev` can leave `.next` in a partial dev-server state that the next production build does not fully recover from on first run. | Add a pre-build cleaner that removes only `web/.next` before `next build`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for deterministic web build fix. | Codex |
