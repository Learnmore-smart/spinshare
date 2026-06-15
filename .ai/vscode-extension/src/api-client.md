# api-client.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Typed HTTP client used by the VS Code extension.

## What It Does

- Calls `GET /api/ad`.
- Calls `POST /api/track`.
- Starts and polls the device authorization flow.
- Handles ad/track failures without disrupting the editor.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdApiClient` | Class | VS Code extension API client. |
| `reportImpression` | Method | Sends one track request. |

## Dependencies

- Internal: shared types from `@spinshare/core`.
- External: Fetch API.

## Important Notes / NEVER Change

- The extension must remain compatible with injected test fetch implementations.
- Track failures should resolve to `null`.
- Production API calls should use `https://www.spinshare.dev`; the bare apex host redirects and can break POST device-flow requests.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Device sign-in could fail with `device/start failed (405): Server returned a non-JSON response.` | A persisted `spinshare.baseUrl` of `https://spinshare.dev` redirects to `https://www.spinshare.dev`; POST redirect handling can turn the request into a GET and Next.js returns 405 HTML. | Add base URL normalization so the extension uses the canonical `www` host for SpinShare production APIs. |

## Planned Change (2026-06-15)

Add a pure base URL normalizer and use it in `AdApiClient` construction so both default and persisted production settings avoid the redirect.

## Implemented Change (2026-06-15)

Added `normalizeBaseUrl`, mapping `https://spinshare.dev` and
`http://spinshare.dev` to `https://www.spinshare.dev` while preserving localhost
and custom URLs. `AdApiClient` now applies it during construction before
building API request URLs.

## Verification (2026-06-15)

- Red: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts` failed because `startDeviceFlow` posted to `https://spinshare.dev/api/auth/device/start`.
- Green: same focused test passed after normalization.
- Full extension suite passed with `corepack pnpm@9.12.0 test` from `vscode-extension`.
- Package build passed with `corepack pnpm@9.12.0 --filter ./vscode-extension package`.

## Planned Change

Require `reportImpression` callers to pass `viewDurationMs` and include it in
the tracking body.

## Implemented Change

`reportImpression` now accepts `viewDurationMs` and posts
`{ campaignId, viewDurationMs }` to `/api/track`, preserving optional bearer
token handling and null-on-failure behavior.

## Verification

- Green: `corepack pnpm@9.12.0 --filter @spinshare/vscode-extension test -- src/api-client.test.ts src/ad-controller.test.ts src/ad-controller.property.test.ts` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added production apex-host normalization for extension API requests. | Codex |
| 2026-06-13 | Created doc before adding VS Code track duration payload. | Codex |
| 2026-06-13 | Synced docs with VS Code tracking duration payload. | Codex |
