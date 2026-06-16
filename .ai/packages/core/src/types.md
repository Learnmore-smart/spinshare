# types.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Defines shared SpinShare domain and API contract types.

## What It Does

- Declares user, campaign, ledger, split, ad, and tracking shapes used across packages.
- Keeps money fields explicit as cents or micro-cents.
- Provides the type contract consumed by the web app, CLI wrapper, and extension.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `Campaign` | Interface | Firestore-backed advertiser campaign record. |
| `AdResponse` | Type | Public ad-fetch response union. |

## Dependencies

- None; this file is pure type declarations.

## Important Notes / NEVER Change

- Do not introduce runtime imports here.
- Keep additions backward-compatible for existing tests and seeded campaign fixtures.
- Money fields must remain integer cents or micro-cents.

## Planned Change

Extend `TrackRequest` with required `viewDurationMs` so all clients and the web
route share the 3-second minimum-view contract. The value represents the
client-observed ad display duration in milliseconds and must be at least
`VIEWABILITY_MIN_MS` when validated by the schema.

## Previous Planned Change

Extend `Campaign` with optional advertiser checkout metadata:

- `contactEmail`
- `destinationUrl`
- `brandName`
- `brandIconDataUrl`
- `publicOnLeaderboard`

These fields support a public homepage checkout funnel without changing ad selection or ledger math.

## Implemented Change

`Campaign` now accepts optional public advertiser metadata: contact email, destination URL, brand name, brand icon data URL, and `publicOnLeaderboard`. The fields are optional so existing tests, seed data, and Firestore documents remain compatible.

## Implemented Change: Tracking Duration

`TrackRequest` now requires `viewDurationMs` so typed clients and API contracts
carry the client-observed display duration alongside `campaignId`.

## Planned Change (2026-06-15 Cumulative Viewability)

Extend the public API contract types for cumulative viewability:

- `AdResponseAvailable` may include pending progress metadata for an
  authenticated developer's locked campaign.
- `TrackResponse` should become a union: `recorded: false` for progress-only
  updates and `recorded: true` for settled impressions that moved or suppressed
  money.
- Keep the existing settled `recorded: true` shape backward-compatible for
  current clients.

## Implemented Change (2026-06-15 Cumulative Viewability)

`AdResponseAvailable` now has optional `accumulatedViewDurationMs` and
`remainingViewDurationMs` fields for an authenticated developer's pending
campaign. `TrackResponse` is now a union of:

- `recorded:false` with accumulated and remaining view duration for progress-only updates
- `recorded:true` with developer credit fields for settled impressions

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented cumulative viewability API response contract types. | Codex |
| 2026-06-13 | Created doc before adding public advertiser checkout campaign metadata. | Codex |
| 2026-06-13 | Synced doc with implemented optional campaign metadata fields. | Codex |
| 2026-06-13 | Documented required track view duration field before editing shared types. | Codex |
| 2026-06-13 | Synced doc with required `TrackRequest.viewDurationMs`. | Codex |
| 2026-06-15 | Planned cumulative viewability response contract types. | Codex |
