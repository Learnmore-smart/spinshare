# route.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Focused route tests for `POST /api/track`.

## What It Does

- Verifies invalid request bodies are rejected at the HTTP boundary.
- Verifies the 3-second minimum viewability contract before ledger mutation.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Track route tests | Vitest suite | HTTP boundary coverage. |

## Dependencies

- External: `vitest`.
- Internal: route handler and mocked server container/ledger service.

## Important Notes / NEVER Change

- Tests should prove invalid view durations do not reach ledger logic.

## Planned Change

Create failing tests for below-minimum `viewDurationMs` and accepted
threshold-duration requests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding track route viewability tests. | Codex |
