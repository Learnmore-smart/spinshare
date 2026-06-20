# campaign-review.test.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Tests campaign content review and the pay-then-review funding seam.

## What It Does

- Verifies safe and unsafe content review outcomes.
- Verifies first funding review transitions and top-up behavior.
- Verifies exact budget and purchased-inventory credits.

## Dependencies

- Internal: campaign review service and memory campaign repository.
- External: Vitest.

## Implemented Change 2026-06-20 Funding Inventory

Change funding calls to pass exact purchased impressions, assert the campaign
counter is incremented, and test valid metadata plus exact legacy inference.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Keep inventory resolution beside the funding seam so webhook and reconciliation cannot implement different legacy rules.

## Important Notes / NEVER Change

- Tests must prove budget and inventory move together.
- Top-ups must not rerun review.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added funding inventory and legacy resolver tests. | Codex |
