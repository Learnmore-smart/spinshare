# collections.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Centralizes Firestore collection names and document-to-domain mappers.

## What It Does

- Names Firestore collections used by the app.
- Converts Firestore document data into core domain types.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `COLLECTIONS` | Constant | Firestore collection path map. |
| `toCampaign` | Function | Maps campaign document data into a `Campaign`. |

## Dependencies

- Internal: `@spinshare/core` type declarations.

## Important Notes / NEVER Change

- Keep mapper defaults backward-compatible with existing Firestore documents.
- Do not perform network I/O in mapper functions.

## Planned Change

Map optional public checkout metadata from campaign documents, defaulting `publicOnLeaderboard` to true for older campaigns.

## Planned Change 2026-06-15

Support an optional Firestore namespace for localhost/test usage. `SPINSHARE_FIRESTORE_NAMESPACE=test` should make collection paths resolve under `test/...` instead of writing top-level `users`, `campaigns`, `ledgerEntries`, and `paymentEvents`.

## Implemented Change 2026-06-15

`SPINSHARE_FIRESTORE_NAMESPACE=test` now maps collections to Firestore-valid nested paths under `namespaces/test/...`, e.g. `namespaces/test/campaigns`. This preserves top-level collection names when unset and avoids invalid even-segment collection paths.

## Planned Change 2026-06-15 Activity Ledger

Add an `impressionActivities` collection path for attempt-level activity
records. It must respect `SPINSHARE_FIRESTORE_NAMESPACE` exactly like users,
campaigns, ledger entries, and payment events.

## Implemented Change 2026-06-15 Activity Ledger

`COLLECTIONS.impressionActivities` now resolves through the shared
`collectionPath()` helper and respects `SPINSHARE_FIRESTORE_NAMESPACE`.

## Planned Change 2026-06-15 Cumulative Viewability

Add `COLLECTIONS.impressionProgress` for pending cumulative ad-view progress.
It must respect `SPINSHARE_FIRESTORE_NAMESPACE` exactly like other durable
collections.

## Planned Change 2026-06-15 Namespace Coverage

Extend collection path tests to assert every current collection, including
`impressionActivities`, so new Firestore-backed activity data cannot silently
escape the namespace during localhost/testing runs.

## Implemented Change 2026-06-15 Namespace Coverage

Namespace tests now assert all current collection paths, including
`impressionActivities`, `impressionProgress`, and `paymentEvents`.

## Implemented Change 2026-06-16 Payout Attempt Ledger

Added `COLLECTIONS.payoutAttempts` through the shared namespace-aware
`collectionPath()` helper.

## Implemented Change 2026-06-16 Ad Review Status

`toCampaign()` now maps missing/unknown `reviewStatus` as `approved`, preserving
legacy campaign documents while giving new code an explicit safety review field.

## Implemented Change

`toCampaign()` maps optional public checkout fields and treats missing `publicOnLeaderboard` as public.

## Planned Change 2026-06-20 Canonical Identity

Add namespace-aware `userIdentities` and map optional linked providers from user
documents without breaking legacy rows.

## Implemented Change 2026-06-20 Canonical Identity

Added `COLLECTIONS.userIdentities`; `toUser` now maps and de-duplicates linked
providers with a legacy single-provider fallback.

## Planned Change 2026-06-20 Market Delivery Progress

Map `purchasedImpressions` only when Firestore contains a safe non-negative
integer. Preserve absence for legacy campaign documents so the public market can
reconstruct their purchased total instead of treating it as zero.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned legacy-aware purchased-impression campaign mapping. | Codex |
| 2026-06-20 | Planned identity mapping collection and provider-list mapping. | Codex |
| 2026-06-16 | Mapped campaign review status with legacy-approved default. | Codex |
| 2026-06-16 | Added namespace-aware `payoutAttempts` collection path. | Codex |
| 2026-06-15 | Implemented complete namespace coverage for all collection paths. | Codex |
| 2026-06-15 | Planned complete namespace coverage for all collection paths. | Codex |
| 2026-06-15 | Implemented `impressionActivities` collection path. | Codex |
| 2026-06-15 | Planned `impressionActivities` collection path. | Codex |
| 2026-06-15 | Implemented Firestore namespace path resolution and tests. | Codex |
| 2026-06-15 | Planned namespace support for local Firestore isolation. | Codex |
| 2026-06-13 | Created doc before extending campaign document mapping. | Codex |
| 2026-06-13 | Synced doc with campaign metadata mapper defaults. | Codex |
| 2026-06-15 | Planned `impressionProgress` collection path. | Codex |
