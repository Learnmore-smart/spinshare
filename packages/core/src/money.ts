/**
 * Integer-cent / micro-cent money math for SpinShare.
 *
 * Single source of truth for the 60/40 revenue split, penny rounding, and
 * budget conservation. Every impression moves real money, so the split must be
 * exact and identical everywhere it is computed (the `POST /api/track` ledger
 * engine, the Redis→Firestore flush, and the e2e settlement test all import
 * these functions). To stay exact we use **integer arithmetic only** — never
 * floats.
 *
 * Money convention (see design "Money/Ledger Math"):
 *   - CPM is dollars-per-1000-impressions. `cpmCents = round(cpmDollars * 100)`.
 *   - Per-impression revenue (cents) = `cpmCents / 1000` — a sub-cent rational.
 *   - We represent revenue in **micro-cents** (1 cent = 1000 micro-cents) so
 *     that the sub-cent value is an exact integer:
 *       `revenueMicrocents = cpmCents` (because cpmCents/1000 cents == cpmCents
 *       micro-cents).
 *   - The developer credit is rounded to the nearest whole cent (half-up); the
 *     platform retention is derived by subtraction so the split always conserves
 *     to the micro-cent.
 *
 * Range note: CPM ≤ $1000.00 ⇒ `cpmCents ≤ 100000` ⇒ all intermediate products
 * (e.g. `revenueMicrocents * 60`) stay far below `Number.MAX_SAFE_INTEGER`, so
 * `Math.floor` integer math is exact. A `bigint` path can replace this if the
 * limits ever widen.
 */

import type { Split } from "./types";

/** Number of micro-cents in one whole cent. */
export const MICROCENTS_PER_CENT = 1000;

/** Developer share of per-impression revenue, as a whole-number percentage. */
export const DEVELOPER_SHARE_PERCENT = 60;

/**
 * Exact per-impression revenue in micro-cents for a given CPM.
 *
 * Revenue (cents) = `cpmCents / 1000`. In micro-cents (× 1000) this is exactly
 * `cpmCents`, so the conversion is the identity — kept as a named function for
 * clarity and a single point of truth.
 *
 * @param cpmCents Max CPM bid in integer cents.
 * @returns Per-impression revenue in integer micro-cents.
 */
export function perImpressionRevenueMicrocents(cpmCents: number): number {
  return cpmCents;
}

/**
 * Round `pct` percent of a micro-cent revenue to the nearest whole cent,
 * rounding half-up, using integer arithmetic only, then cap the result to the
 * whole cents available in the exact revenue.
 *
 * value (micro-cents) = `revenueMicrocents * pct / 100`
 * value (cents)       = that / MICROCENTS_PER_CENT
 *
 * Combined denominator is `100 * MICROCENTS_PER_CENT`. Half-up rounding adds
 * `denom / 2` before the integer floor division. The final cap prevents a
 * low-CPM sub-cent impression from crediting 1 cent when total exact revenue is
 * still below 1 cent, which would make platform retention negative.
 *
 * @param revenueMicrocents Exact per-impression revenue in micro-cents.
 * @param pct Whole-number percentage to take (e.g. 60 for the developer share).
 * @returns The rounded amount in whole integer cents.
 */
export function roundHalfUpToCents(revenueMicrocents: number, pct: number): number {
  const denom = 100 * MICROCENTS_PER_CENT; // 100000
  const roundedCreditCents = Math.floor(
    (revenueMicrocents * pct + denom / 2) / denom,
  );
  const availableWholeRevenueCents = Math.floor(
    revenueMicrocents / MICROCENTS_PER_CENT,
  );
  return Math.min(roundedCreditCents, availableWholeRevenueCents);
}

/**
 * Split one impression's revenue between the developer (60%, rounded half-up to
 * the nearest cent) and SpinShare (the remainder).
 *
 * Conservation is guaranteed by construction: retention is computed by
 * subtracting the developer credit (re-expressed in micro-cents) from the exact
 * revenue, so `developerCreditCents * MICROCENTS_PER_CENT +
 * spinshareRetentionMicrocents === revenueMicrocents` always holds. No money is
 * ever created or lost.
 *
 * @param cpmCents Winning campaign CPM in integer cents.
 * @returns The exact micro-cent revenue, the rounded developer credit in cents,
 *   and the platform retention in micro-cents.
 */
export function computeSplit(cpmCents: number): Split {
  const revenueMicrocents = perImpressionRevenueMicrocents(cpmCents);
  const developerCreditCents = roundHalfUpToCents(revenueMicrocents, DEVELOPER_SHARE_PERCENT);
  const developerCreditMicrocents = developerCreditCents * MICROCENTS_PER_CENT;
  const spinshareRetentionMicrocents = revenueMicrocents - developerCreditMicrocents;
  return { revenueMicrocents, developerCreditCents, spinshareRetentionMicrocents };
}

/**
 * Format an integer-cent amount as a plain USD string (no currency symbol),
 * e.g. `18 → "0.18"`, `3000 → "30.00"`. Useful for the `*Usd` display fields in
 * API responses. Integer math only; handles negative values.
 *
 * @param cents Amount in integer cents.
 * @returns The amount formatted with exactly two decimal places.
 */
export function formatCentsAsUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, "0")}`;
}
