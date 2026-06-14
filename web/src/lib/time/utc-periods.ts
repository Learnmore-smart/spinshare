/**
 * Shared UTC period boundaries for earnings caps and dashboard KPIs.
 * All calendar boundaries use UTC — not the user's local timezone.
 */

/** Start of the current UTC calendar day (00:00:00.000Z). */
export function startOfUtcDayMs(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Start of the current UTC calendar month (00:00:00.000Z on the 1st). */
export function startOfUtcMonthMs(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/** Milliseconds from `now` until the next UTC midnight. */
export function msUntilUtcMidnight(now = Date.now()): number {
  return startOfUtcDayMs(now) + 24 * 60 * 60 * 1000 - now;
}

/** `13h 58m` style countdown from a millisecond duration. */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Label for the daily cap reset line. */
export function utcDailyResetLabel(now = Date.now()): string {
  return `Resets midnight UTC · ${formatDurationShort(msUntilUtcMidnight(now))}`;
}

/** Label for the rolling hourly cap (wall-clock independent). */
export const UTC_HOURLY_CAP_LABEL =
  "Rolling 60-minute window · credits counted by UTC timestamp";
