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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Created mirror and documented safety review regression coverage. | Codex |
