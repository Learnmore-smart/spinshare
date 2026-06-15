# api-client.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Planned Changes (2026-06-14)

- Default base URL → `https://www.spinshare.dev`.
- Parse device/start body via `text()` first; clear error when server returns HTML (undeployed Cloud Run placeholder).
- `getBaseUrl()` for login status output.


## Purpose

Typed HTTP client used by the CLI wrapper to fetch ads and report impressions.

## What It Does

- Resolves the SpinShare base URL and bearer token.
- Calls `GET /api/ad`.
- Calls `POST /api/track`.
- Handles network and parse failures gracefully.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `CliApiClient` | Class | CLI API client. |
| `reportImpression` | Method | Sends one tracking request. |

## Dependencies

- Internal: shared types from `@spinshare/core`.
- External: Fetch API.

## Important Notes / NEVER Change

- Network failures must not break wrapped commands.
- Authorization header behavior must remain compatible with stored tokens.
- The production apex host `https://spinshare.dev` must be normalized to `https://www.spinshare.dev` before HTTP calls.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | CLI login and bundled terminal shims could hit a 405 HTML response during device start when configured with `https://spinshare.dev`. | The apex host redirects to `www`; POST redirects can be retried as GET and reach a POST-only Next.js route. | Canonicalize production base URLs inside `resolveBaseUrl`. |

## Planned Change (2026-06-15)

Add pure base URL normalization to `resolveBaseUrl` so explicit, environment,
and default values all avoid the production redirect.

## Implemented Change (2026-06-15)

Added `normalizeBaseUrl`, mapping the production apex host to
`https://www.spinshare.dev`. `resolveBaseUrl` applies it to explicit,
environment, and default URL sources.

## Verification (2026-06-15)

- Red: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts` failed because `resolveBaseUrl("https://spinshare.dev/")` returned the apex host.
- Green: same focused test passed after normalization.
- Full CLI test suite passed with `corepack pnpm@9.12.0 --filter @spinshare/cli test`.
- CLI build passed as part of `corepack pnpm@9.12.0 --filter ./vscode-extension package`.

## Planned Change

Require callers to pass `viewDurationMs` to `reportImpression` and include it
in the `POST /api/track` JSON body.

## Implemented Change

`reportImpression(campaignId, viewDurationMs, token?)` now posts both
`campaignId` and `viewDurationMs`, preserving token behavior and graceful
failure handling.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added production apex-host normalization to CLI base URL resolution. | Codex |
| 2026-06-13 | Created doc before adding CLI track duration payload. | Codex |
| 2026-06-13 | Synced doc with implemented CLI tracking payload duration. | Codex |
