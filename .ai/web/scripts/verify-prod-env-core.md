# verify-prod-env-core.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose
Dependency-free validation helpers for the production environment verifier.

## What It Does

- Exports `checkStrictModes` for unit tests and the CLI script.
- Validates production mode flags without contacting Firebase, Stripe, GitHub, or Google.
- Validates a flush trigger secret is configured for the protected reconciliation endpoint.
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
- Do not allow production to pass without either `SPINSHARE_FLUSH_SECRET` or `CRON_SECRET`; the dashboard/payout ledger path depends on scheduled flush.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** After adding `POST /api/internal/flush`, production preflight must fail if no scheduler secret exists. The route fails closed by design, so missing the secret would make dashboard and payout reconciliation silently remain unavailable.

## Planned Change 2026-06-20 GA build env

- Warn when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset in strict production checks.
- GA4 is optional for local dev but should be set before production Docker builds.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Warn when `NEXT_PUBLIC_GA_MEASUREMENT_ID` missing in production preflight. | Cursor |
| 2026-06-16 | Implemented required `SPINSHARE_FLUSH_SECRET`/`CRON_SECRET` production check. | Codex |
| 2026-06-16 | Planned production check for flush trigger secret. | Codex |
| 2026-06-15 | Created pure strict-mode validation module to make production env tests import-safe. | Codex |
