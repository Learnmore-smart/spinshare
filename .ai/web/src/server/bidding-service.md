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
- Paid campaigns without a valid public HTTPS `destinationUrl` must not be
  served. Otherwise `/api/ad` returns a tracked `/api/click` URL that falls back
  to the local app root and click telemetry is misleading.

## Bug Fix 2026-06-18 Destinationless Click Redirect

**Root Cause:** `selectAd()` accepted any campaign with budget and CPM as
biddable, including legacy or dashboard-created campaigns without a saved
destination URL. The ad route wraps destinations in `/api/click`; when the
campaign lacks a destination, the click route redirects to `/` on localhost.

**Fix Plan:** Add regression coverage for normal selection and pending-progress
selection, then require a valid public HTTPS destination before returning a
campaign from `selectAd()`.

**Implemented:** `selectAd()` now filters both pending-progress campaigns and
normal candidates through a single biddability gate: active status, positive
budget, positive CPM, approved review state, and a valid public HTTPS
destination URL.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented destination-required biddability fix. | Codex |
| 2026-06-18 | Planned destination-required biddability fix. | Codex |
| 2026-06-15 | Implemented pending-progress ad selection. | Codex |
| 2026-06-15 | Created doc before adding pending-progress ad selection. | Codex |
