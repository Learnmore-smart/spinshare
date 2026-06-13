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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before mirroring public checkout metadata in memory campaigns. | Codex |
| 2026-06-13 | Synced doc with memory campaign metadata persistence. | Codex |
