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
- Biddable also means the campaign has a valid public HTTPS destination URL,
  is active, and is approved for review; paid-but-incomplete campaigns stay
  editable but must not be served.
- Keep the port storage-oriented; Stripe and auth concerns belong in route/services.

## Planned Change

Allow campaign creation to carry optional public checkout metadata and the public leaderboard visibility flag.

## Implemented Change

`NewCampaign` now accepts optional contact email, destination URL, brand name, brand icon data URL, and `publicOnLeaderboard`.

## Implemented Change 2026-06-16 Ad Review Status

`NewCampaign` now accepts optional `reviewStatus`, and `CampaignRepository`
exposes `updateReviewStatus(id, reviewStatus)` so automated/manual reviewers can
move campaigns between `pending`, `approved`, and `rejected`.

## Planned Change 2026-06-18 Destination Required

Clarify the `listBiddable()` contract: repository adapters should not return
campaigns that cannot produce a safe click-through destination.

## Implemented Change 2026-06-18 Destination Required

The port documentation now defines biddable as paid, active, approved, and
having a valid public HTTPS destination URL.

## Planned Change 2026-06-18 Delete Unpaid Campaign

Add a `delete(id)` repository method so the authenticated campaigns route can
permanently remove an unpaid campaign after it has checked ownership and zero
budget. The port remains storage-only; authorization and unpaid checks stay in
the route.

## Implemented Change 2026-06-18 Delete Unpaid Campaign

`CampaignRepository` now includes `delete(id): Promise<void>` for permanent
campaign removal after route-level authorization and unpaid checks.

## Implemented Change 2026-06-20 Market Delivery Progress

Add `applyFunding(id, { amountCents, purchasedImpressions })` as the dedicated
positive-funding operation. It must update remaining budget and cumulative
purchased inventory together. Keep `applyBudgetDeltaCents` for settlement/spend
adjustments, which must not change purchased inventory.

New campaigns initialize `purchasedImpressions` to zero. Legacy rows may omit
the field and remain on the market endpoint's reconstruction path.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented atomic budget plus purchased-inventory funding contract. | Codex |
| 2026-06-18 | Implemented repository delete method for unpaid campaign removal. | Codex |
| 2026-06-18 | Planned repository delete method for unpaid campaign removal. | Codex |
| 2026-06-18 | Implemented destination-required biddability contract docs. | Codex |
| 2026-06-18 | Documented destination-required biddability contract. | Codex |
| 2026-06-16 | Added campaign review status creation/update contract. | Codex |
| 2026-06-13 | Created doc before extending campaign creation metadata. | Codex |
| 2026-06-13 | Synced doc with campaign creation metadata extension. | Codex |
