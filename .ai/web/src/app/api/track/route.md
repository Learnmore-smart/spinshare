# route.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

HTTP adapter for `POST /api/track` impression tracking.

## What It Does

- Parses request JSON.
- Validates the body with `trackRequestSchema`.
- Extracts the bearer token.
- Delegates authorized, valid impressions to `recordImpression`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | Route handler | Tracks one eligible impression. |

## Dependencies

- Internal: `@/server/container`, `@/server/ledger-service`.
- External: `@spinshare/core` schema.

## Important Notes / NEVER Change

- Malformed or invalid request bodies must return `400` without mutation.
- Missing or invalid tokens must return `401`.
- Invalid or unfunded campaigns must return `422`.

## Planned Change

Backend validation will require the shared `viewDurationMs >= 3000` tracking
contract. The route should keep delegating only after schema validation passes.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding track route viewability contract coverage. | Codex |
