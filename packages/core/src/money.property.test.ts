import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DEVELOPER_SHARE_PERCENT,
  MICROCENTS_PER_CENT,
  computeSplit,
  perImpressionRevenueMicrocents,
} from "./money";

/**
 * Property-based tests for the integer-cent money math.
 *
 * CPM is constrained to its valid range (`cpmCents` 1..100000, i.e.
 * $0.01–$1000.00) so the generators exercise only inputs the system accepts.
 * Each property runs with fast-check at 100 iterations.
 */

/** Valid CPM range per the design and Zod schema: 1..100000 integer cents. */
const validCpmCents = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 100000 });

describe("money math properties", () => {
  // Feature: spinshare-ad-exchange, Property 4: Per-impression revenue equals CPM/1000
  // Validates: Requirements 2.1
  it("Property 4: per-impression revenue equals CPM/1000 (== cpmCents micro-cents)", () => {
    fc.assert(
      fc.property(validCpmCents(), (cpmCents) => {
        const revenueMicrocents = perImpressionRevenueMicrocents(cpmCents);
        // revenue (cents) = cpmCents / 1000; in micro-cents (× 1000) == cpmCents exactly.
        expect(revenueMicrocents).toBe(cpmCents);
        // The micro-cent value divided back into cents equals cpmCents / 1000.
        expect(revenueMicrocents / MICROCENTS_PER_CENT).toBeCloseTo(
          cpmCents / 1000,
          10,
        );
        // computeSplit reports the same exact revenue.
        expect(computeSplit(cpmCents).revenueMicrocents).toBe(cpmCents);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: spinshare-ad-exchange, Property 5: Developer credit is 60% rounded to the nearest cent
  // Validates: Requirements 2.2
  it("Property 5: developer credit is 60% of revenue rounded half-up to the nearest cent", () => {
    fc.assert(
      fc.property(validCpmCents(), (cpmCents) => {
        const { revenueMicrocents, developerCreditCents } = computeSplit(cpmCents);

        // Independent half-up reference: 60% of revenue (micro-cents) → cents.
        // creditMicrocents = revenueMicrocents * 60 / 100; cents = / 1000, half-up.
        const numerator = revenueMicrocents * DEVELOPER_SHARE_PERCENT;
        const denom = 100 * MICROCENTS_PER_CENT; // 100000
        const expectedCreditCents = Math.floor((numerator + denom / 2) / denom);

        expect(developerCreditCents).toBe(expectedCreditCents);

        // The credit is within half a cent of the exact 60% value (rounding bound).
        const exactCreditCents =
          (revenueMicrocents * DEVELOPER_SHARE_PERCENT) / denom;
        expect(Math.abs(developerCreditCents - exactCreditCents)).toBeLessThanOrEqual(0.5);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: spinshare-ad-exchange, Property 6: Split conservation (no money created or lost)
  // Validates: Requirements 2.3, 2.6
  it("Property 6: developer credit + retention conserves the full revenue exactly", () => {
    fc.assert(
      fc.property(validCpmCents(), (cpmCents) => {
        const { revenueMicrocents, developerCreditCents, spinshareRetentionMicrocents } =
          computeSplit(cpmCents);

        const developerCreditMicrocents =
          developerCreditCents * MICROCENTS_PER_CENT;

        // No money created or lost: credit (in micro-cents) + retention == revenue.
        expect(developerCreditMicrocents + spinshareRetentionMicrocents).toBe(
          revenueMicrocents,
        );

        // Developer credit is stored at one-cent precision (whole integer cents).
        expect(Number.isInteger(developerCreditCents)).toBe(true);
        // Retention is exact (integer micro-cents) and never negative.
        expect(Number.isInteger(spinshareRetentionMicrocents)).toBe(true);
        expect(spinshareRetentionMicrocents).toBeGreaterThanOrEqual(0);
        expect(developerCreditCents).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });
});
