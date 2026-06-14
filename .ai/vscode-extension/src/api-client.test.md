# api-client.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

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
| 2026-06-13 | Created doc before adding VS Code API view duration test. | Codex |
| 2026-06-13 | Synced docs with VS Code API duration payload assertions. | Codex |
