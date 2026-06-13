# clean-next.mjs

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Removes the generated Next.js build directory before production builds.

## What It Does

- Resolves the web package root from the script location.
- Verifies the target path is exactly `web/.next`.
- Deletes `web/.next` recursively with `force: true`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `clean-next.mjs` | script | Safe generated-artifact cleanup before `next build`. |

## Dependencies

- **External:** Node `fs/promises`, `path`, `url`.

## Important Notes / NEVER Change

- Never accept user input for the deletion target.
- Never delete outside the web package root.
- Only generated `.next` output is in scope.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Production build can fail after dev e2e because `.next` contains stale dev artifacts. | Next build did not consistently clean dev leftovers on this Windows workspace. | Remove `web/.next` before each production build. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for clean-next script. | Codex |
