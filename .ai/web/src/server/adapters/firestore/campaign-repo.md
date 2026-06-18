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

## Planned Change 2026-06-16 Ad Review Status

Persist campaign `reviewStatus` and exclude pending/rejected campaigns from
Firestore-backed `listBiddable()`. Legacy documents with no reviewStatus should
map as approved for backward compatibility.

## Implemented Change 2026-06-16 Ad Review Status

`create()` stores `reviewStatus`, `listBiddable()` filters to approved campaigns
after the budget query, and `updateReviewStatus()` transactionally updates the
review field plus `updatedAt`.

## Planned Change 2026-06-18 Destination Required

After loading positive-budget campaigns, Firestore-backed `listBiddable()` must
filter out rows with a missing or invalid destination URL. This protects legacy
or partially-created campaigns from being served with a tracked click URL that
would redirect to the local root fallback.

## Implemented Change 2026-06-18 Destination Required

Firestore-backed `listBiddable()` now filters the positive-budget query result
to active, positive-CPM, approved-review campaigns with a valid public HTTPS
destination URL.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented destination-required biddability filtering. | Codex |
| 2026-06-18 | Planned destination-required biddability filtering. | Codex |
| 2026-06-16 | Implemented review-status persistence, filtering, and update. | Codex |
| 2026-06-16 | Planned campaign review-status persistence and filtering. | Codex |
| 2026-06-13 | Created doc before storing public checkout campaign metadata. | Codex |
| 2026-06-13 | Synced doc with Firestore campaign metadata persistence. | Codex |
