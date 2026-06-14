# api-client.ts

> Last updated: 2026-06-14 | Protection: STANDARD

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
| 2026-06-13 | Created doc before adding CLI track duration payload. | Codex |
| 2026-06-13 | Synced doc with implemented CLI tracking payload duration. | Codex |
