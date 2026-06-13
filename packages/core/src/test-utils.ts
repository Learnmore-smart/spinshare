/**
 * Shared fast-check arbitraries for SpinShare `@spinshare/core` property tests.
 *
 * Pure, test-only helpers (not re-exported from the package barrel and never
 * bundled — `tsup` only builds `src/index.ts`). Centralizing the generators for
 * campaigns, CPMs, funding amounts, and impression sequences keeps the
 * conservation and validation property tests consistent and intelligently
 * constrained to the real input space.
 */

import fc from "fast-check";

import {
  AD_TEXT_MAX_LENGTH,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
} from "./schemas";
import type { LedgerSeqEvent } from "./velocity";

// ---------------------------------------------------------------------------
// CPM arbitraries
// ---------------------------------------------------------------------------

/** A valid max-CPM bid in integer cents (1..100000 ⇒ $0.01..$1000.00). */
export const validCpmCentsArb = fc.integer({ min: CPM_CENTS_MIN, max: CPM_CENTS_MAX });

/**
 * An invalid *numeric* CPM: non-positive, above the max, non-integer
 * (sub-cent), or NaN. Every value is rejected by `cpmCentsSchema`.
 */
export const invalidCpmArb: fc.Arbitrary<number> = fc.oneof(
  // zero or negative
  fc.integer({ min: -100_000, max: 0 }),
  // above the $1000.00 maximum
  fc.integer({ min: CPM_CENTS_MAX + 1, max: CPM_CENTS_MAX + 1_000_000 }),
  // non-integer (finer than one-cent precision)
  fc
    .double({ min: 0.001, max: 99_999.999, noNaN: true, noDefaultInfinity: true })
    .filter((n) => !Number.isInteger(n)),
  // not a number
  fc.constant(Number.NaN),
);

// ---------------------------------------------------------------------------
// Ad-text arbitraries
// ---------------------------------------------------------------------------

const nonWhitespaceCharArb = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+".split(""),
);

const whitespaceCharArb = fc.constantFrom(" ", "\t", "\n");

/**
 * Valid ad text: length 1..60 with at least one non-whitespace character.
 *
 * Built from a guaranteed non-whitespace head plus up to 59 further characters
 * (whitespace or not), so the result is always 1..60 chars and never
 * whitespace-only — exactly the space `adTextSchema` accepts.
 */
export const validAdTextArb: fc.Arbitrary<string> = fc
  .tuple(
    nonWhitespaceCharArb,
    fc.array(fc.oneof(nonWhitespaceCharArb, whitespaceCharArb), {
      minLength: 0,
      maxLength: AD_TEXT_MAX_LENGTH - 1,
    }),
  )
  .map(([head, rest]) => head + rest.join(""));

/**
 * Invalid ad text: empty, whitespace-only, or longer than 60 characters. Every
 * value is rejected by `adTextSchema`.
 */
export const invalidAdTextArb: fc.Arbitrary<string> = fc.oneof(
  // empty
  fc.constant(""),
  // whitespace-only (length 1..60)
  fc
    .array(whitespaceCharArb, { minLength: 1, maxLength: AD_TEXT_MAX_LENGTH })
    .map((chars) => chars.join("")),
  // too long (> 60 characters), regardless of content
  fc.string({ minLength: AD_TEXT_MAX_LENGTH + 1, maxLength: AD_TEXT_MAX_LENGTH + 60 }),
);

// ---------------------------------------------------------------------------
// Funding-amount arbitraries
// ---------------------------------------------------------------------------

/**
 * Any funding amount in cents spanning the valid range and each invalid family
 * (below min, above max, sub-cent). Pair with the acceptance predicate
 * `Number.isInteger(a) && FUNDING_CENTS_MIN <= a <= FUNDING_CENTS_MAX`.
 */
export const anyAmountCentsArb: fc.Arbitrary<number> = fc.oneof(
  // valid
  fc.integer({ min: FUNDING_CENTS_MIN, max: FUNDING_CENTS_MAX }),
  // below the $1.00 minimum
  fc.integer({ min: 0, max: FUNDING_CENTS_MIN - 1 }),
  // above the $100,000.00 maximum
  fc.integer({ min: FUNDING_CENTS_MAX + 1, max: FUNDING_CENTS_MAX + 1_000_000 }),
  // sub-cent (non-integer) precision
  fc
    .double({ min: 1, max: FUNDING_CENTS_MAX, noNaN: true, noDefaultInfinity: true })
    .filter((n) => !Number.isInteger(n)),
);

// ---------------------------------------------------------------------------
// Non-numeric arbitrary (shared by CPM + funding rejection tests)
// ---------------------------------------------------------------------------

/** Values that are not finite numbers; always rejected by `z.number()`. */
export const nonNumericArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.constant("100"),
  fc.constant(null),
  fc.constant(undefined),
  fc.boolean(),
  fc.constant({}),
);

// ---------------------------------------------------------------------------
// Ledger / impression sequence arbitraries (conservation properties)
// ---------------------------------------------------------------------------

const fundEventArb: fc.Arbitrary<LedgerSeqEvent> = fc
  .integer({ min: 1, max: 10_000_000 })
  .map((amountMicrocents) => ({ type: "fund", amountMicrocents }));

const impressionEventArb: fc.Arbitrary<LedgerSeqEvent> = fc
  .record({ cpmCents: validCpmCentsArb, shadowBanned: fc.boolean() })
  .map(({ cpmCents, shadowBanned }) => ({ type: "impression", cpmCents, shadowBanned }));

/**
 * An arbitrary ordered mix of `fund` and `impression` events (some
 * shadow-banned). Funding may be insufficient, so impressions can be rejected
 * on a non-positive budget — exercising the Requirement 2.8 gate.
 */
export const ledgerSeqArb: fc.Arbitrary<LedgerSeqEvent[]> = fc.array(
  fc.oneof(fundEventArb, impressionEventArb),
  { minLength: 0, maxLength: 60 },
);

/**
 * A sequence that funds enough up front to cover every subsequent impression
 * (funding == Σ per-impression revenue + 1 micro-cent). Because revenue in
 * micro-cents equals `cpmCents`, the budget stays strictly positive at every
 * step, so the budget never goes below zero. Used to demonstrate the design's
 * "budget never goes below zero" claim under sufficient funding (the literal
 * `budget <= 0` gate in Requirement 2.8 only bounds an overshoot otherwise).
 */
export const wellFundedImpressionSeqArb: fc.Arbitrary<LedgerSeqEvent[]> = fc
  .array(validCpmCentsArb, { minLength: 0, maxLength: 50 })
  .map((cpmList) => {
    const totalRevenueMicrocents = cpmList.reduce((sum, cpmCents) => sum + cpmCents, 0);
    const fund: LedgerSeqEvent = {
      type: "fund",
      amountMicrocents: totalRevenueMicrocents + 1,
    };
    const impressions: LedgerSeqEvent[] = cpmList.map((cpmCents) => ({
      type: "impression",
      cpmCents,
      shadowBanned: false,
    }));
    return [fund, ...impressions];
  });
