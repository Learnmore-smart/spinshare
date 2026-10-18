# api-client.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for the VS Code extension API client.

## What It Does

- Verifies ad fetch request shape and parsing.
- Verifies tracking request shape and parsing.
- Verifies failure handling.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdApiClient` tests | Vitest suite | Request and parser coverage. |

## Dependencies

- External: `vitest`.
- Internal: `./api-client`.

## Important Notes / NEVER Change

- Tests must use fake fetch implementations only.

## Planned Change 2026-06-15 Authenticated Ad Fetch

Add a failing regression test proving `AdApiClient.getAd()` returns
`{ adAvailable:false }` and does not call `fetch` when no constructor or per-call
token is available.

## Implemented Test 2026-06-15 Authenticated Ad Fetch

Added a no-token `getAd()` test and updated the successful ad-fetch test to use
an authenticated client token.

## Verification 2026-06-15 Authenticated Ad Fetch

- Red: focused extension API client test failed because anonymous `getAd()` returned a stubbed ad.
- Green: focused extension API client test passed with 9 tests.
- Full extension suite passed with 50 tests.
- Root regression and lint/typecheck passed.

## Planned Change (2026-06-15)

Add a failing regression test proving `https://spinshare-web-vert.vercel.app/` is normalized to
`https://spinshare-web-vert.vercel.app` before device-flow requests are built.

## Implemented Test (2026-06-15)

Added a `startDeviceFlow` regression test asserting that a client constructed
with `https://spinshare-web-vert.vercel.app/` posts to
`https://spinshare-web-vert.vercel.app/api/auth/device/start`.

## Verification (2026-06-15)

- Red: focused extension API client test failed on the expected URL mismatch.
- Green: focused extension API client test passed after the normalizer was added.
- Full extension test suite passed.

## Planned Change

Add a failing assertion that `reportImpression` includes `viewDurationMs` in
the JSON body.

## Implemented Change

The API client tests now assert the tracking request body includes
`viewDurationMs` and that authenticated calls continue to pass the bearer token.

## Verification

- Green: `corepack pnpm@9.12.0 --filter @spinshare/vscode-extension test -- src/api-client.test.ts src/ad-controller.test.ts src/ad-controller.property.test.ts` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added validation endpoint client tests for valid, invalid, unknown, and no-token behavior. | Codex |
| 2026-06-16 | Planned tests for token validation endpoint handling. | Codex |
| 2026-06-15 | Added extension ad-fetch token gate regression coverage. | Codex |
| 2026-06-15 | Planned extension ad-fetch token gate regression coverage. | Codex |
| 2026-06-15 | Added regression coverage for canonical production device-start URL. | Codex |
| 2026-06-13 | Created doc before adding VS Code API view duration test. | Codex |
| 2026-06-13 | Synced docs with VS Code API duration payload assertions. | Codex |
