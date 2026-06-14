/**
 * Pure presentation logic for the developer dashboard.
 *
 * `summarizeLedger` turns a developer's durable {@link LedgerEntry} records into
 * the exact view-model the dashboard renders: the total-earnings KPI
 * (Requirement 8.1), an earnings-over-time series for the chart (Requirement
 * 8.2), and one activity row per impression with its credited amount
 * (Requirement 8.3).
 *
 * This module is intentionally **pure and I/O-free** so it is the single source
 * of truth for what the UI shows and can be exercised directly from ledger
 * fixtures by the dashboard property test (task 12.5 / Property 25) without
 * mounting a server, a database, or a browser. The page server component
 * fetches the entries and feeds them here; the view component renders the
 * result.
 *
 * Money stays in integer cents throughout; USD strings are produced only for
 * display via `@spinshare/core`'s `formatCentsAsUsd` so values can never drift
 * from the ledger.
 */

import { formatCentsAsUsd, type LedgerEntry } from "@spinshare/core";

/** One row of the activity ledger table (one impression). */
export interface LedgerActivityRow {
  /** Stable key / idempotency id of the underlying entry. */
  entryId: string;
  /** Sequence number of this impression (1-based) in recording order. */
  sequence: number;
  /** Campaign the impression was attributed to. */
  campaignId: string;
  /** Amount credited to the developer for this impression, in integer cents. */
  developerCreditCents: number;
  /** `developerCreditCents` formatted as a USD string, e.g. "0.18". */
  developerCreditUsd: string;
  /** When the impression was recorded, if known. */
  createdAtMs?: number;
}

/** One point of the earnings-over-time chart series. */
export interface EarningsSeriesPoint {
  /** Impression sequence number (1-based) — the x value. */
  sequence: number;
  /** Short label for the x axis, e.g. "#1". */
  label: string;
  /** Credit recorded at this impression, in integer cents. */
  creditCents: number;
  /** Running total of credited earnings through this impression, in cents. */
  cumulativeCents: number;
  /** `cumulativeCents` as a numeric USD value (dollars) for the chart axis. */
  cumulativeUsd: number;
}

/**
 * The complete view-model for the developer dashboard, derived purely from a
 * developer's ledger entries.
 */
export interface DeveloperDashboardSummary {
  /** Total earnings KPI = sum of every credited amount, in integer cents. */
  totalEarningsCents: number;
  /** `totalEarningsCents` formatted as a USD string for the KPI card. */
  totalEarningsUsd: string;
  /** Credits recorded since UTC midnight today, in integer cents. */
  todayEarningsCents: number;
  /** `todayEarningsCents` formatted as a USD string. */
  todayEarningsUsd: string;
  /** Credits in the rolling last 60 minutes, in integer cents. */
  hourlyEarningsCents: number;
  /** `hourlyEarningsCents` formatted as a USD string. */
  hourlyEarningsUsd: string;
  /** Credits recorded in the current calendar month, in integer cents. */
  monthEarningsCents: number;
  /** `monthEarningsCents` formatted as a USD string. */
  monthEarningsUsd: string;
  /** Number of recorded impressions (== number of activity rows). */
  impressionCount: number;
  /** Cumulative earnings series for the chart, one point per impression. */
  series: EarningsSeriesPoint[];
  /** One activity-table row per impression, in recording order. */
  rows: LedgerActivityRow[];
}

function startOfUtcDayMs(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function startOfUtcMonthMs(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function formatShortUtcDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export type ChartRange = "24h" | "7d" | "30d" | "all";

const CHART_RANGE_MS: Record<Exclude<ChartRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Builds a cumulative chart series for entries inside a time window. */
export function buildChartSeries(
  rows: readonly LedgerActivityRow[],
  range: ChartRange,
  now = Date.now(),
): EarningsSeriesPoint[] {
  const inRange =
    range === "all"
      ? rows
      : rows.filter((row) => {
          const cutoff = now - CHART_RANGE_MS[range];
          return row.createdAtMs === undefined || row.createdAtMs >= cutoff;
        });
  let cumulativeCents = 0;
  return inRange.map((row, index) => {
    cumulativeCents += row.developerCreditCents;
    const sequence = index + 1;
    return {
      sequence,
      label:
        row.createdAtMs !== undefined
          ? formatShortUtcDate(row.createdAtMs)
          : `#${row.sequence}`,
      creditCents: row.developerCreditCents,
      cumulativeCents,
      cumulativeUsd: cumulativeCents / 100,
    };
  });
}

/**
 * Summarize a developer's ledger entries into the dashboard view-model.
 *
 * Invariants (validated by Property 25):
 *   - `totalEarningsCents` equals the sum of `developerCreditCents` across every
 *     entry.
 *   - `rows.length === entries.length`, and each entry contributes exactly one
 *     row carrying its own `developerCreditCents`.
 *
 * Input order is preserved (entries are assumed already in recording order, as
 * returned by `LedgerRepository.listByDeveloper`). The function never mutates
 * its input.
 *
 * @param entries Durable ledger entries credited to the developer.
 * @returns The pure view-model the dashboard renders.
 */
export function summarizeLedger(
  entries: readonly LedgerEntry[],
): DeveloperDashboardSummary {
  const rows: LedgerActivityRow[] = [];
  const series: EarningsSeriesPoint[] = [];
  let totalEarningsCents = 0;
  let todayEarningsCents = 0;
  let hourlyEarningsCents = 0;
  let monthEarningsCents = 0;
  const dayStart = startOfUtcDayMs();
  const monthStart = startOfUtcMonthMs();
  const hourStart = Date.now() - 60 * 60 * 1000;

  entries.forEach((entry, index) => {
    const sequence = index + 1;
    const credit = entry.developerCreditCents;
    totalEarningsCents += credit;

    const atMs = entry.createdAtMs;
    if (atMs !== undefined) {
      if (atMs >= hourStart) hourlyEarningsCents += credit;
      if (atMs >= dayStart) todayEarningsCents += credit;
      if (atMs >= monthStart) monthEarningsCents += credit;
    }

    rows.push({
      entryId: entry.entryId,
      sequence,
      campaignId: entry.campaignId,
      developerCreditCents: credit,
      developerCreditUsd: formatCentsAsUsd(credit),
      ...(atMs !== undefined ? { createdAtMs: atMs } : {}),
    });

    series.push({
      sequence,
      label: atMs !== undefined ? formatShortUtcDate(atMs) : `#${sequence}`,
      creditCents: credit,
      cumulativeCents: totalEarningsCents,
      cumulativeUsd: totalEarningsCents / 100,
    });
  });

  return {
    totalEarningsCents,
    totalEarningsUsd: formatCentsAsUsd(totalEarningsCents),
    todayEarningsCents,
    todayEarningsUsd: formatCentsAsUsd(todayEarningsCents),
    hourlyEarningsCents,
    hourlyEarningsUsd: formatCentsAsUsd(hourlyEarningsCents),
    monthEarningsCents,
    monthEarningsUsd: formatCentsAsUsd(monthEarningsCents),
    impressionCount: entries.length,
    series,
    rows,
  };
}
