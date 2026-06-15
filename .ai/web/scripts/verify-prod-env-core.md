# verify-prod-env-core.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose
Dependency-free validation helpers for the production environment verifier.

## What It Does

- Exports `checkStrictModes` for unit tests and the CLI script.
- Validates production mode flags without contacting Firebase, Stripe, GitHub, or Google.
- Returns localhost auth URL warnings as plain ASCII strings.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `checkStrictModes` | Function | Checks strict production flags and returns `{ name, ok, detail, warnings }`. |

## Dependencies

- None beyond JavaScript runtime APIs.

## Important Notes / NEVER Change

- Keep this module dependency-free so Vitest can import strict-mode validation without loading live provider SDKs.
- Do not print or expose secret values.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created pure strict-mode validation module to make production env tests import-safe. | Codex |
