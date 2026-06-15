# utc-periods.ts

## Purpose
Shared UTC period boundaries and countdown helpers for dashboard earning-cap labels.

## Planned change (2026-06-14)
- Add `ROLLING_HOUR_MS` and `msUntilOldestRollingHourCreditExpires()` for the developer dashboard hourly cap meter.
- Hourly countdown = time until the oldest credit still inside the rolling 60-minute window falls out.
- Add `msUntilNextUtcHour()` — countdown to the next UTC hour boundary (used when the rolling window has no credits).
- Returns `null` when the window has no credited entries; the UI falls back to `msUntilNextUtcHour`.

## Constraints
- All calendar boundaries use UTC.
- Countdown formatting reuses `formatDurationShort` (`13h 58m` / `45m`).
