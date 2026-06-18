# health.e2e.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Smoke-tests the e2e harness and built web API readiness.

## What It Does

- Starts the Next.js app through the shared e2e harness.
- Verifies the app binds a local ephemeral port.
- Verifies `/api/health` returns `200`.
- Verifies anonymous `/api/ad` is rejected with `401`, matching the current authenticated ad-selection contract.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `e2e harness` | test suite | HTTP smoke coverage for the web app under `next dev` or `next start`. |

## Dependencies

- **Internal:** `./harness` - starts and stops the app under test.
- **External:** Vitest and Fetch API - assertions and HTTP calls.

## Important Notes / NEVER Change

- Keep this suite transport-level; it should call the booted server, not route handlers directly.
- Keep it valid for both dev-mode and production-start e2e runs.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | E2E smoke expected anonymous `/api/ad` to return `{ adAvailable: false }`, but the current production contract requires `Device_Auth_Token` for all ad selection. | The test was written before `/api/ad` became authenticated and before ad selection began writing per-developer progress/click tokens. | Update the transport smoke to assert anonymous `/api/ad` returns `401 Unauthorized`; authenticated no-ad selection remains covered by route-level API tests where a mock token can be minted in-process. |
| 2026-06-13 | Production-start verification did not explicitly hit `/api/ad`, one of the P0 API routes called out in the handoff. | Existing e2e smoke coverage only checked `/api/health`; settlement checked malformed `/api/track`. | Add a `/api/ad` HTTP smoke assertion expecting `200` and `{ adAvailable: false }` with empty local memory state. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for API smoke coverage expansion. | Codex |
| 2026-06-13 | Added `/api/ad` HTTP smoke assertion for no-campaign local state. | Codex |
| 2026-06-17 | Updated `/api/ad` HTTP smoke assertion for the authenticated ad-selection contract. | Codex |
