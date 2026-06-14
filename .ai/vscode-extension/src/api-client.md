# api-client.ts

> Last updated: 2026-06-13 | Protection: STANDARD

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
| 2026-06-13 | Created doc before adding VS Code track duration payload. | Codex |
| 2026-06-13 | Synced docs with VS Code tracking duration payload. | Codex |
