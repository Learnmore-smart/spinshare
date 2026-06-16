# package-manifest.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests npm publish/install readiness for the CLI package manifest.

## What It Does

- Reads `cli-wrapper/package.json`.
- Verifies the package is publishable instead of marked private.
- Verifies runtime dependencies do not use workspace protocol versions.
- Verifies `@spinshare/core` stays a development-only type dependency because
  the built CLI does not runtime-import it.

## Public API

| Name | Type | Description |
|------|------|-------------|
| package manifest tests | Vitest suite | Guards npm package publishability. |

## Important Notes / NEVER Change

- The npm CLI package must be installable by users outside this monorepo.
- Do not allow `workspace:*` in runtime dependencies.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned npm package manifest publishability tests. | Codex |
