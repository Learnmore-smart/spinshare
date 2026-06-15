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
