# developer-earnings-view.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Render the developer earnings curve with selectable time ranges.

## Current Behavior

- Builds the selected cumulative series from summarized ledger rows.
- Shows a setup empty state when there are no impressions.

## Planned Change 2026-06-20 Welcome Gift Curve

Choose chart versus empty state from `chartSeries.length`, not
`impressionCount`. A new user with a timestamped $1 signup bonus and zero
impressions should see the `$1.00` point; a selected range with no ledger rows
should still show the empty state.

## Dependencies

- Internal: `buildChartSeries` and dashboard summary context.
- Internal: `EarningsChart`, `SegmentSlider`, and setup guide link.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Impression count is an event KPI, not a valid proxy for
  whether the earnings series has credited data.

## Important Notes / NEVER Change

- Respect the selected time-range filter.
- Do not count signup bonuses as impressions.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created doc and planned bonus-only chart rendering. | Codex |

## Implemented Change 2026-06-20 Welcome Gift Curve

Chart rendering now depends on the selected `chartSeries` being non-empty, so a
bonus-only account renders `$1.00` without incrementing impression count.
