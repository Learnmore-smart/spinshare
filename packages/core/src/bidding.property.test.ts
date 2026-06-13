import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { selectWinner } from "./bidding";
import type { Campaign } from "./types";

/**
 * Property-based tests for pure bidding selection.
 *
 * Feature: spinshare-ad-exchange
 *   - Property 1: Eligibility-gated selection (Requirements 1.1, 1.4)
 *   - Property 2: Highest-CPM winner with deterministic tie-break
 *                 (Requirements 1.2, 1.3, 1.5, 1.6)
 *   - Property 3: Selection is order-independent / deterministic (Requirement 1.5)
 *
 * All properties run with fast-check `{ numRuns: 100 }`.
 */

const RUNS = { numRuns: 100 } as const;

/** Eligibility predicate mirroring Requirement 1.1. */
const isEligible = (c: Campaign): boolean => c.budgetCents > 0 && c.cpmCents > 0;

/**
 * Arbitrary for a single Campaign. CPM and budget ranges intentionally include
 * zero and negatives so the eligibility filter (Req 1.1) is exercised, and are
 * kept small so ties on `cpmCents` and `createdAtMs` occur frequently.
 */
const campaignArb = (id: string): fc.Arbitrary<Campaign> =>
  fc.record({
    id: fc.constant(id),
    advertiserId: fc.constantFrom("adv_1", "adv_2", "adv_3"),
    adText: fc.constantFrom("Ad A", "Ad B", "Ad C"),
    cpmCents: fc.integer({ min: -50, max: 50 }),
    budgetCents: fc.integer({ min: -50, max: 50 }),
    status: fc.constantFrom<Campaign["status"]>("active", "paused"),
    createdAtMs: fc.integer({ min: 0, max: 20 }),
  });

/**
 * Arbitrary for a list of campaigns with unique ids (ids are unique per
 * campaign in the domain, which is what makes `isBetterBid` a strict total
 * order). Ids are zero-padded so lexicographic ordering is well-defined.
 */
const campaignsArb: fc.Arbitrary<Campaign[]> = fc
  .uniqueArray(fc.integer({ min: 0, max: 999 }), { minLength: 0, maxLength: 12 })
  .chain((nums) =>
    fc.tuple(
      ...nums.map((n) => campaignArb(`cmp_${String(n).padStart(3, "0")}`)),
    ),
  );

/** Fisher-Yates-style permutation arbitrary for an array, for order-independence. */
const permutationOf = <T>(items: T[]): fc.Arbitrary<T[]> =>
  fc
    .array(fc.double({ min: 0, max: 1, noNaN: true }), {
      minLength: items.length,
      maxLength: items.length,
    })
    .map((keys) =>
      items
        .map((item, i) => ({ item, key: keys[i] ?? 0 }))
        .sort((a, b) => a.key - b.key)
        .map(({ item }) => item),
    );

describe("selectWinner — bidding properties", () => {
  // Feature: spinshare-ad-exchange, Property 1: Eligibility-gated selection
  it("Property 1: returns an eligible winner, or null exactly when none are eligible", () => {
    fc.assert(
      fc.property(campaignsArb, (candidates) => {
        const winner = selectWinner(candidates);
        const eligible = candidates.filter(isEligible);

        if (eligible.length === 0) {
          // Req 1.4: empty candidate set ⇒ no advertisement available.
          expect(winner).toBeNull();
        } else {
          // Req 1.1: the winner is always drawn from the eligible set.
          expect(winner).not.toBeNull();
          expect(isEligible(winner!)).toBe(true);
          expect(eligible.some((c) => c.id === winner!.id)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 2: Highest-CPM winner with deterministic tie-break
  it("Property 2: winner has max CPM, then earliest createdAtMs, then lowest id", () => {
    fc.assert(
      fc.property(campaignsArb, (candidates) => {
        const winner = selectWinner(candidates);
        const eligible = candidates.filter(isEligible);
        if (eligible.length === 0) {
          expect(winner).toBeNull();
          return;
        }

        // Req 1.2 / 1.6: winner holds the highest CPM among eligible candidates.
        const maxCpm = Math.max(...eligible.map((c) => c.cpmCents));
        expect(winner!.cpmCents).toBe(maxCpm);

        // Req 1.5: among top-CPM ties, earliest createdAtMs wins.
        const topCpm = eligible.filter((c) => c.cpmCents === maxCpm);
        const earliest = Math.min(...topCpm.map((c) => c.createdAtMs));
        expect(winner!.createdAtMs).toBe(earliest);

        // Req 1.5: among createdAtMs ties, the lowest id wins.
        const earliestTies = topCpm.filter((c) => c.createdAtMs === earliest);
        const lowestId = earliestTies
          .map((c) => c.id)
          .reduce((a, b) => (a < b ? a : b));
        expect(winner!.id).toBe(lowestId);

        // Req 1.3: the winner is one of the actual candidates (identifiable).
        expect(candidates.some((c) => c.id === winner!.id)).toBe(true);
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 3: Selection is order-independent (determinism)
  it("Property 3: any permutation of candidates yields the same winner", () => {
    fc.assert(
      fc.property(
        campaignsArb.chain((candidates) =>
          fc.tuple(fc.constant(candidates), permutationOf(candidates)),
        ),
        ([original, shuffled]) => {
          const a = selectWinner(original);
          const b = selectWinner(shuffled);
          expect(a?.id ?? null).toBe(b?.id ?? null);
        },
      ),
      RUNS,
    );
  });
});
