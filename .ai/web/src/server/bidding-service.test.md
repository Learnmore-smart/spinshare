# bidding-service.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for the ad bidding service.

## What It Does

- Verifies highest eligible CPM wins.
- Verifies no-candidate and timeout fallbacks.
- Verifies pending cumulative view progress is prioritized for the same
  developer.
- Verifies campaigns pending safety review are not eligible for bidding.
- Verifies paid campaigns without a valid destination URL are not eligible, so
  clicks cannot fall back to the local app root.

## Planned Change 2026-06-18 Destination Required

Add RED regression tests that fail against the current selector:

- normal highest-bid selection skips a paid campaign with no destination URL
- pending-progress selection clears a destinationless campaign instead of
  serving it again

## Implemented Change 2026-06-18 Destination Required

Added both destination-required regressions. RED run failed because
destinationless campaigns were selected; GREEN run passed after the selector
and repositories enforced destination-required biddability.

## Planned Change 2026-06-18 Campaign Repository Delete Contract

Update local `CampaignRepository` test doubles to include the new `delete(id)`
method required by the storage port. These tests do not exercise deletion, so
the method should throw if called.

## Implemented Change 2026-06-18 Campaign Repository Delete Contract

The stalled and failing `CampaignRepository` test doubles now include throwing
`delete()` stubs to satisfy the expanded repository contract.

## Verification 2026-06-18

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/server/bidding-service.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Implemented Change 2026-06-20 Campaign Funding Contract

Add throwing `applyFunding()` methods to the two local repository test doubles
so they satisfy the expanded storage port. Bidding tests do not exercise money
movement, so invocation remains an explicit test failure.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented test-double update for campaign funding contract. | Codex |
| 2026-06-18 | Implemented test-double update for repository delete contract. | Codex |
| 2026-06-18 | Planned test-double update for repository delete contract. | Codex |
| 2026-06-18 | Implemented destination-required bidding regression coverage. | Codex |
| 2026-06-18 | Planned destination-required bidding regression coverage. | Codex |
| 2026-06-16 | Created mirror and documented safety review regression coverage. | Codex |
