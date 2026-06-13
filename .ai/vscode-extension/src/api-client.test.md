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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding VS Code API view duration test. | Codex |
