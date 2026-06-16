# bidding-service.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Selects the ad returned by `GET /api/ad`.

## Planned Change 2026-06-15 Cumulative Viewability

Before normal highest-bid selection, check whether the authenticated developer
has pending cumulative viewability progress:

- if the pending campaign still exists and is biddable, return that same ad
  with progress metadata
- if the pending campaign is missing or no longer biddable, clear the stale
  progress and fall back to normal bidding
- if the request is unauthenticated, keep existing normal bidding behavior

## Implemented Change 2026-06-15 Cumulative Viewability

`selectAd` now accepts optional `developerId` and `progress` dependencies. When
both are present, it checks the developer's pending progress before normal
highest-bid selection. A valid pending campaign is returned with
`accumulatedViewDurationMs` and `remainingViewDurationMs`; stale progress is
cleared before falling back to normal bidding.

## Verification 2026-06-15

- Focused web cumulative viewability run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-impression-progress-repository.test.ts src/server/bidding-service.test.ts src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`.

## Important Notes

- Keep timeout behavior for normal bidding.
- Do not store prompts or request content.
- Pending progress should not let a missing/unfunded campaign keep being served.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented pending-progress ad selection. | Codex |
| 2026-06-15 | Created doc before adding pending-progress ad selection. | Codex |
