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
| 2026-06-15 | Legacy CLI wrapper could fetch and display ads while unauthenticated, then fail tracking with no developer attribution. | `getAd()` called the public `/api/ad` endpoint without requiring a bearer token; the server can return an ad anonymously, but `/api/track` requires auth. | Planned: make `getAd()` return unavailable without calling the network when no token is present. |
| 2026-06-15 | CLI login and bundled terminal shims could hit a 405 HTML response during device start when configured with `https://spinshare.dev`. | The apex host redirects to `www`; POST redirects can be retried as GET and reach a POST-only Next.js route. | Canonicalize production base URLs inside `resolveBaseUrl`. |

## Planned Change 2026-06-15 Authenticated Ad Fetch

Require `CliApiClient.getAd()` to have a non-empty bearer token before it calls
`GET /api/ad`. If the token provider returns `null`, `undefined`, or an empty
string, `getAd()` should return `{ adAvailable: false }` and make no network
request.

This keeps the old generic wrapper from showing unpaid anonymous ads. The
login/device-flow methods remain unauthenticated, and `reportImpression()`
keeps its existing graceful failure behavior.

## Implemented Change 2026-06-15 Authenticated Ad Fetch

`getAd()` now resolves authorization headers before fetching. When the
Authorization header is absent, it returns `{ adAvailable: false }` immediately
and does not call `fetch`.

## Verification 2026-06-15 Authenticated Ad Fetch

- Red: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts` failed because anonymous `getAd()` returned a real ad from the stubbed public endpoint.
- Green: the same focused test passed after adding the token gate.
- Full CLI test passed: `corepack pnpm@9.12.0 --filter @spinshare/cli test`.
- Root regression passed: `corepack pnpm@9.12.0 test`.
- Root lint/typecheck passed: `corepack pnpm@9.12.0 lint`.
- VSIX package rebuild passed: `corepack pnpm@9.12.0 --filter ./vscode-extension package`.
- npm publish dry-run passed with a workspace-local npm cache.

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

## Planned Change 2026-06-15 Cumulative Viewability

Parse both track response shapes:

- `recorded: false` progress-only responses for below-threshold cumulative views
- existing `recorded: true` settled responses

Keep graceful null-on-failure behavior.

## Implemented Change 2026-06-15 Cumulative Viewability

`parseAdResponse` now preserves optional `accumulatedViewDurationMs` and
`remainingViewDurationMs` metadata. `parseTrackResponse` now accepts both
settled responses (`recorded:true`) and progress-only responses
(`recorded:false`) while still returning `null` for malformed payloads.

## Verification 2026-06-15 Cumulative Viewability

- Focused CLI API/wrapper test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts src/wrap.test.ts`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added token gate to CLI ad fetch to prevent anonymous ad display. | Codex |
| 2026-06-15 | Implemented cumulative viewability response parsing. | Codex |
| 2026-06-15 | Planned cumulative viewability track response parsing. | Codex |
| 2026-06-15 | Added production apex-host normalization to CLI base URL resolution. | Codex |
| 2026-06-13 | Created doc before adding CLI track duration payload. | Codex |
| 2026-06-13 | Synced doc with implemented CLI tracking payload duration. | Codex |
