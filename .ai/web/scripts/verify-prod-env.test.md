# verify-prod-env.test.mjs

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Unit tests for the production environment verifier's pure validation logic.

## What It Does

- Imports verifier helpers without running live provider probes.
- Verifies strict production mode warns on local-only auth URLs.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `checkStrictModes` tests | Vitest suite | Asserts strict env flags catch production blockers. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | Test file only. |

## Dependencies

- **Internal:** `web/scripts/verify-prod-env-core.mjs` - verifier helper under test.
- **External:** `vitest` - test runner.

## Important Notes / NEVER Change

- Tests must not contact Firebase, Stripe, GitHub, or Google.
- Tests must not print secret values.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Import `checkStrictModes` from the dependency-free core verifier module. | Codex |
| 2026-06-15 | Use ASCII warning expectations to avoid parser failures from corrupted smart punctuation. | Codex |
| 2026-06-14 | Planned strict-mode regression test for localhost `AUTH_VERIFICATION_URI`. | Codex |
