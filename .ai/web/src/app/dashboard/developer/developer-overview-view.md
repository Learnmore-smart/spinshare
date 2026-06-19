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

## Implemented Fix 2026-06-18 Payout Threshold Display Precision

Bug:
- The hero balance KPI already shows display-precision earnings such as
  `$0.075`, but the payout-threshold helper text computed `remaining`
  from whole cents only (`MINIMUM_PAYOUT_CENTS - totalEarningsCents`).
- For a sub-cent balance, `totalEarningsCents` is `0`, so the hero showed
  `还差 $5.00` instead of `还差 $4.925` — inconsistent with the visible balance.

Fix:
- Payout eligibility (`totalEarningsCents >= MINIMUM_PAYOUT_CENTS`) and the
  progress bar still use whole-cent accounting fields (unlock logic unchanged).
- The hero threshold copy now derives remaining/target from display
  micro-cents: `minimumPayoutMicrocents = MINIMUM_PAYOUT_CENTS *
  MICROCENTS_PER_CENT`, `remaining = max(0, minimum - totalEarningsDisplayMicrocents)`.
- Remaining/target render with exactly 3 decimals via the new
  `moneyMicrocents3` helper in `developer-dashboard-parts.tsx`
  (e.g. `$4.925` and `$5.000`).

Regression risk:
- Display-only precision change for the hero copy; actual payout unlock logic
  and the progress meter are untouched.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented payout-threshold display precision (3-decimal, sub-cent remaining). | Cursor |
| 2026-06-18 | Planned payout-threshold display precision fix for sub-cent balances. | Codex |
| 2026-06-18 | Used display-precision summary strings in overview cap meters. | Codex |
