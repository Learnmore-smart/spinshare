# advertiser-dashboard.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Styles for the advertiser dashboard shell, panels, campaign cards, and form fields.

## Planned Change (2026-06-14)

- Add `.adv-dash-submit-btn` with amber box-shadow matching the rail logo treatment.
- Set `.adv-dash-panel { overflow: visible; }` so bottom shadows are not clipped.

## Planned Change (2026-06-15)

- Add compact telemetry grid/row styles for always-visible advertiser dashboard
  stat containers and per-campaign diagnostic counters.

## Implemented Change (2026-06-15)

Added compact campaign telemetry and diagnostics row styles with responsive
grid behavior and tabular numeric formatting.

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Submit button shadow + panel overflow fix. | Codex |
