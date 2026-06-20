# memory-campaign-repository.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

In-memory campaign repository for local development and tests.

## What It Does

- Stores campaign records in a process-local map.
- Creates zero-budget campaigns with deterministic clocks/ids in tests.
- Lists biddable and advertiser-owned campaigns.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MemoryCampaignRepository` | Class | In-memory `CampaignRepository` implementation. |

## Dependencies

- Internal: campaign repository port and memory clock/id utilities.

## Important Notes / NEVER Change

- Test helpers should remain deterministic.
- Creation behavior should mirror Firestore creation behavior.

## Planned Change

Copy optional public checkout metadata and `publicOnLeaderboard` into created campaigns.

## Implemented Change

`MemoryCampaignRepository.create()` mirrors Firestore creation metadata and defaults `publicOnLeaderboard` to true.

## Planned Change 2026-06-16 Ad Review Status

Campaign bidding must respect a separate safety review state. New/legacy
approved campaigns remain biddable, while `pending` or `rejected` campaigns must
not be returned from `listBiddable()`.

## Implemented Change 2026-06-16 Ad Review Status

`create()` defaults review status to `approved`, `listBiddable()` filters to
approved campaigns only, and `updateReviewStatus()` updates the in-memory record
for future async/manual review flows.

## Planned Change 2026-06-18 Destination Required

`listBiddable()` must also exclude campaigns with no valid public HTTPS
destination URL. Funding without a destination should keep the campaign editable
in the dashboard, but it must not enter ad selection because click-through would
fall back to the local app root.

## Implemented Change 2026-06-18 Destination Required

`listBiddable()` now requires active status, positive budget/CPM, approved
review state, and a valid public HTTPS destination URL.

## Planned Change 2026-06-18 Delete Unpaid Campaign

Implement the new campaign repository `delete(id)` method by removing the
campaign from the in-memory map and throwing if the id is unknown, matching the
existing update-style error behavior.

## Implemented Change 2026-06-18 Delete Unpaid Campaign

The memory repository now implements `delete(id)` by removing the campaign from
the local map and throwing when the id is unknown.

## Implemented Change 2026-06-20 Market Delivery Progress

Mirror Firestore by initializing new campaigns with zero purchased impressions
and adding `applyFunding` to increment budget plus cumulative inventory. A
manually seeded legacy campaign with no inventory field keeps it absent during
funding; ordinary budget deltas never change inventory.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented memory parity for campaign funding inventory. | Codex |
| 2026-06-18 | Implemented memory repository delete method for unpaid campaign removal. | Codex |
| 2026-06-18 | Planned memory repository delete method for unpaid campaign removal. | Codex |
| 2026-06-18 | Implemented destination-required biddability filtering. | Codex |
| 2026-06-18 | Planned destination-required biddability filtering. | Codex |
| 2026-06-16 | Implemented review-status filtering and update. | Codex |
| 2026-06-16 | Planned review-status biddability filtering. | Codex |
| 2026-06-13 | Created doc before mirroring public checkout metadata in memory campaigns. | Codex |
| 2026-06-13 | Synced doc with memory campaign metadata persistence. | Codex |
