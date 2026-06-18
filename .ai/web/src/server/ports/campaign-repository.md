# campaign-repository.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Defines the durable campaign storage port used by route handlers and services.

## What It Does

- Describes campaign creation, lookup, owner listing, biddable listing, and budget delta operations.
- Lets Firestore and in-memory adapters share one contract.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `NewCampaign` | Interface | Input for creating a campaign. |
| `CampaignRepository` | Interface | Durable campaign storage operations. |

## Dependencies

- Internal: `@spinshare/core` campaign type.

## Important Notes / NEVER Change

- New campaigns start with zero budget and become biddable only after funding.
- Keep the port storage-oriented; Stripe and auth concerns belong in route/services.

## Planned Change

Allow campaign creation to carry optional public checkout metadata and the public leaderboard visibility flag.

## Implemented Change

`NewCampaign` now accepts optional contact email, destination URL, brand name, brand icon data URL, and `publicOnLeaderboard`.

## Implemented Change 2026-06-16 Ad Review Status

`NewCampaign` now accepts optional `reviewStatus`, and `CampaignRepository`
exposes `updateReviewStatus(id, reviewStatus)` so automated/manual reviewers can
move campaigns between `pending`, `approved`, and `rejected`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added campaign review status creation/update contract. | Codex |
| 2026-06-13 | Created doc before extending campaign creation metadata. | Codex |
| 2026-06-13 | Synced doc with campaign creation metadata extension. | Codex |
