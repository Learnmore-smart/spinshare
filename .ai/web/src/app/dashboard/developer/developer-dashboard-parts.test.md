# developer-dashboard-parts.test.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Static render tests for developer dashboard shared presentation parts.

## Planned Coverage

- Activity table renders attempt-level status labels and duration, not just
  credited ledger ids.
- Activity list/table do not expose raw ledger detail disclosures on the
  developer-facing dashboard.
- Cap meters can render a display-precision label while keeping whole-cent
  progress math.

## Implemented Coverage 2026-06-18 Remove Raw User-Facing Details

Added render coverage proving mobile and desktop developer activity rows omit
the `Details` disclosure, raw activity id, and created timestamp.

## Implemented Coverage 2026-06-18 Display Labels for Cap Meters

Added static-render coverage for `LimitMeter` showing a sub-cent display label,
for example `$0.012 / $20.00`, without changing the whole-cent cap value.

## Planned Coverage 2026-06-18 Fixed-Precision Payout Display Labels

Add pure formatter coverage for the overview hero payout copy so display
micro-cent values render with exactly 3 decimals:
- `$0.015`
- `$4.985`
- `$5.000`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned fixed-precision payout display formatter coverage. | Codex |
| 2026-06-18 | Implemented coverage for optional cap meter display labels. | Codex |
| 2026-06-18 | Implemented coverage for removing raw activity details from developer rows. | Codex |
| 2026-06-18 | Planned coverage for removing raw activity details from developer rows. | Codex |
| 2026-06-15 | Created doc before adding developer activity table tests. | Codex |
