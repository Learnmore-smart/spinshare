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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented review-status filtering and update. | Codex |
| 2026-06-16 | Planned review-status biddability filtering. | Codex |
| 2026-06-13 | Created doc before mirroring public checkout metadata in memory campaigns. | Codex |
| 2026-06-13 | Synced doc with memory campaign metadata persistence. | Codex |
