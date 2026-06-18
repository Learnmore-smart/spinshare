# summarize-ledger.test.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Unit tests for pure developer dashboard ledger aggregation.

## Planned Coverage

- Empty summaries render zero values.
- Whole-cent ledger credits keep existing totals and row values.
- Sub-cent credited rows aggregate into dashboard display strings instead of
  showing `$0.00`, with up to 3 decimals.
- Chart series remains cumulative and non-mutating.

## Planned Change 2026-06-18 Sub-Cent Dashboard Summary

Add RED coverage for four `$5 CPM` credited impressions, each carrying
`500` revenue micro-cents and `0` whole-cent credit. The summary display should
show visible earnings as `0.012` instead of `0.00`.

## Implemented Change 2026-06-18 Sub-Cent Dashboard Summary

Added RED/GREEN coverage for four `$5 CPM` impressions rendering `0.012` in the
total, today, month, and hourly summary strings.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented sub-cent dashboard summary coverage for 3-decimal display. | Codex |
| 2026-06-18 | Created doc and planned sub-cent dashboard summary coverage. | Codex |
