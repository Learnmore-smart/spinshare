# dashboard.property.test.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Property tests for developer dashboard ledger summary invariants.

## What It Does

- Verifies whole-cent accounting totals still equal summed ledger credits.
- Verifies activity rows map one-to-one with ledger entries.
- Verifies display-precision totals reconcile with row display amounts.

## Planned Change 2026-06-18 Display Micro-Cent Invariants

Update the summary property to distinguish accounting cents from display
micro-cents. The dashboard KPI string can now be based on display micro-cents
for sub-cent credited rows, while `totalEarningsCents` remains the sum of
`developerCreditCents`.

## Implemented Change 2026-06-18 Display Micro-Cent Invariants

The property now independently sums display micro-cents, verifies
`totalEarningsDisplayMicrocents`, checks the visible USD string, and confirms
row display totals reconcile with the summary.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented display micro-cent property invariants. | Codex |
| 2026-06-18 | Created doc and planned display micro-cent property updates. | Codex |
