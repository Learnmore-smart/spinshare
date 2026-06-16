# activity-feed.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests shared activity feed formatting helpers.

## Planned Coverage

- Credited rows show a human-readable credited status and USD credit.
- Too-short rows show duration and zero credit.
- Rows sort newest first for dashboard activity feeds.
- Advertiser money event rows show event-specific labels and amounts.

## Implemented Coverage 2026-06-15 Advertiser Money Events

Added coverage for `budgetFunded` advertiser event formatting: label, event
detail text, amount label, counted flag, and type preservation.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added advertiser money event formatting coverage. | Codex |
| 2026-06-15 | Created doc before adding activity feed helper tests. | Codex |
