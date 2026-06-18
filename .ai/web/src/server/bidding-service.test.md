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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented destination-required bidding regression coverage. | Codex |
| 2026-06-18 | Planned destination-required bidding regression coverage. | Codex |
| 2026-06-16 | Created mirror and documented safety review regression coverage. | Codex |
