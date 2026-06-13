# campaign-repo.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Firestore-backed implementation of the campaign repository port.

## What It Does

- Stores campaign documents in `campaigns/{campaignId}`.
- Lists biddable and advertiser-owned campaigns.
- Applies budget deltas atomically for funding and settlement.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `FirestoreCampaignRepo` | Class | Firestore implementation of `CampaignRepository`. |

## Dependencies

- External: `firebase-admin/firestore`.
- Internal: campaign repository port, Firestore client, and collection mappers.

## Important Notes / NEVER Change

- Budget increments must remain transactional.
- Creation must keep new campaigns at zero budget until Stripe webhook funding.

## Planned Change

Persist optional public checkout metadata and `publicOnLeaderboard` when a campaign is created.

## Implemented Change

`FirestoreCampaignRepo.create()` stores optional public checkout metadata and defaults `publicOnLeaderboard` to true.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before storing public checkout campaign metadata. | Codex |
| 2026-06-13 | Synced doc with Firestore campaign metadata persistence. | Codex |
