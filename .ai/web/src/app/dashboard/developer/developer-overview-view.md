# developer-overview-view.tsx

## Purpose
Developer dashboard overview: balance KPI, stat strip, earning-cap meters, payout callout.

## Planned change (2026-06-14)
- **Bug/UX:** Hourly rolling cap showed static text while daily cap already counted down.
- Tick `now` every minute so daily and hourly reset labels stay live.
- Hourly meter always uses `hourlyResetLabel(duration)` — same shape as daily (`滚动 60 分钟窗口 · 45m`).
- Duration = time until the oldest in-window credit rolls off when credits exist; otherwise time until the next UTC hour boundary (server cap reset — never `0m` at idle).

## Dependencies
- `@/lib/time/utc-periods` — `formatDurationShort`, `msUntilUtcMidnight`, `msUntilNextUtcHour`, `msUntilOldestRollingHourCreditExpires`
- `useDeveloperDashboard().summary.rows` — entry timestamps for rolling-window math

## Implemented Change 2026-06-18 Sub-Cent Cap Display

Overview stat cards read the display-precision USD strings from
`summarizeLedger()`, so small credited impressions can show values such as
`$0.012` instead of rounding visually to `$0.01` or `$0.00`.

Hourly and daily cap meters pass those display strings through `usedLabel`,
while the meter progress and cap enforcement still use whole-cent accounting
fields.

## Planned Fix 2026-06-18 Payout Threshold Display Precision

Bug:
- The hero balance KPI already shows display-precision earnings such as
  `$0.015`, but the payout-threshold helper text still computes `remaining`
  from whole cents only.
- That makes the UI inconsistent: with a visible balance of `$0.015`, the hero
  still says `还差 $5.00` instead of `还差 $4.985`.

Fix plan:
- Keep payout eligibility and progress based on whole-cent accounting fields.
- Compute the hero threshold copy from display micro-cents so the visible
  remaining amount matches the visible balance.
- Render the hero threshold remaining/target values with exactly 3 decimals,
  e.g. `$4.985` and `$5.000`.

Regression risk:
- Do not change actual payout unlock logic; this is a display-only precision
  fix for the hero copy.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned payout-threshold display precision fix for sub-cent balances. | Codex |
| 2026-06-18 | Used display-precision summary strings in overview cap meters. | Codex |
