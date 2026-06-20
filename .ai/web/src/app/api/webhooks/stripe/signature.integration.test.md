# signature.integration.test.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Tests the signed Stripe webhook path through verification and campaign funding.

## Implemented Change 2026-06-20 Funding Inventory

Include valid purchased-impression metadata in signed completed-checkout events
so successful funding exercises the current money-plus-inventory contract.

## Important Notes / NEVER Change

- Preserve real signature verification coverage.
- Invalid signatures must never mutate budget or inventory.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Updated signed Checkout fixture with purchased inventory. | Codex |
