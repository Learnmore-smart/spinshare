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
  /** Number of recorded impressions (== number of activity rows). */
  impressionCount: number;
  /** Cumulative earnings series for the chart, one point per impression. */
  series: EarningsSeriesPoint[];
  /** One activity-table row per impression, in recording order. */
  rows: LedgerActivityRow[];
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

  entries.forEach((entry, index) => {
    const sequence = index + 1;
    const credit = entry.developerCreditCents;
    totalEarningsCents += credit;

    rows.push({
      entryId: entry.entryId,
      sequence,
      campaignId: entry.campaignId,
      developerCreditCents: credit,
      developerCreditUsd: formatCentsAsUsd(credit),
    });

    series.push({
      sequence,
      label: `#${sequence}`,
      creditCents: credit,
      cumulativeCents: totalEarningsCents,
      cumulativeUsd: totalEarningsCents / 100,
    });
  });

  return {
    totalEarningsCents,
    totalEarningsUsd: formatCentsAsUsd(totalEarningsCents),
    impressionCount: entries.length,
    series,
    rows,
  };
}
