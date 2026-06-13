// Feature: spinshare-ad-exchange
//
// Property test for the money-movement guards on `POST /api/track`
// (`recordImpression`, design "Ledger Engine" steps 1–2). It exercises the two
// rejection paths against the credential-free in-memory adapters and asserts
// the universal invariant that a *rejected* request never moves money: the
// developer balance delta stays at 0 and the campaign budget delta stays at 0
// in the `MemoryCounterStore` (the hot-path Redis stand-in), and the service
// returns `ok: false` with the contractually-correct status:
//
//   - 401 — missing / invalid `Device_Auth_Token` (Requirements 2.9, 4.7), and
//   - 422 — campaign missing or `budgetCents <= 0`  (Requirement 2.8).

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Campaign } from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MockAuthProvider,
  SequentialIdGenerator,
} from "./adapters/memory";
import {
  INVALID_CAMPAIGN_ERROR,
  UNAUTHORIZED_ERROR,
  recordImpression,
  type LedgerServiceDeps,
} from "./ledger-service";

const RUNS = { numRuns: 100 } as const;

const DEV = "dev-1";
/** A valid, fully-fundable campaign used to isolate the auth guard. */
const FUNDED_CAMPAIGN_ID = "cmp-funded";

/** CPM range mirrors the campaign schema ($0.01–$1000.00 ⇒ 1–100000 cents). */
const cpmArb = fc.integer({ min: 1, max: 100_000 });

/**
 * Build a fresh harness with deterministic clock/id generation. Each property
 * run gets its own adapters so the "no money moved" assertions start from a
 * pristine (all-zero) counter store.
 */
function makeHarness(): {
  deps: LedgerServiceDeps;
  auth: MockAuthProvider;
  campaigns: MemoryCampaignRepository;
  counters: MemoryCounterStore;
} {
  const clock = new ManualClock(0);
  const ids = new SequentialIdGenerator();
  const auth = new MockAuthProvider(clock, ids);
  const campaigns = new MemoryCampaignRepository(clock, ids);
  const counters = new MemoryCounterStore(clock, ids);
  return { deps: { auth, campaigns, counters, clock, ids }, auth, campaigns, counters };
}

function fundedCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: FUNDED_CAMPAIGN_ID,
    advertiserId: "adv-1",
    adText: "Ship faster with Acme CI",
    cpmCents: 3000,
    budgetCents: 1000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
}

/**
 * Invalid tokens: absent (`undefined`/`null`), empty/whitespace-only, and
 * arbitrary strings. No token is ever minted in this scenario, so every value
 * fails validation (`validateToken` → `null`) and can never collide with a real
 * `Device_Auth_Token`.
 */
const badTokenArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(""),
  fc.constantFrom("   ", "\t", "\n  "),
  fc.string({ minLength: 1, maxLength: 40 }),
);

describe("ledger-service money-movement guard properties", () => {
  // Feature: spinshare-ad-exchange, Property 9: Invalid requests never move money
  // Validates: Requirements 2.8, 2.9, 4.7
  it("Property 9a: a missing/invalid token is rejected with 401 and moves no money", async () => {
    await fc.assert(
      fc.asyncProperty(
        badTokenArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        async (token, arbitraryCampaignId, targetFunded) => {
          const { deps, campaigns, counters } = makeHarness();
          // Seed a fully-fundable campaign so the ONLY reason to reject is the
          // bad token (Requirement 4.7: token validated before processing).
          campaigns.seed(fundedCampaign());

          // Sometimes target the funded campaign, sometimes an arbitrary id —
          // either way the auth guard must fire first.
          const campaignId = targetFunded
            ? FUNDED_CAMPAIGN_ID
            : arbitraryCampaignId;

          const result = await recordImpression(deps, { token, campaignId });

          expect(result).toEqual({
            ok: false,
            status: 401,
            error: UNAUTHORIZED_ERROR,
          });
          // No money moved (Requirement 2.9): balance + budget deltas stay 0.
          expect(await counters.getBalanceCents(DEV)).toBe(0);
          expect(await counters.getBudgetCents(FUNDED_CAMPAIGN_ID)).toBe(0);
          expect(await counters.getBudgetCents(campaignId)).toBe(0);
        },
      ),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 9: Invalid requests never move money
  // Validates: Requirements 2.8, 2.9, 4.7
  it("Property 9b: a valid token against a missing/insufficient campaign is rejected with 422 and moves no money", async () => {
    // Either the campaign is absent, or it exists with a non-positive budget.
    const invalidCampaignArb = fc.oneof(
      fc.record({
        type: fc.constant("missing" as const),
        campaignId: fc.string({ minLength: 1, maxLength: 20 }),
      }),
      fc.record({
        type: fc.constant("insufficient" as const),
        budgetCents: fc.integer({ min: -10_000, max: 0 }),
        cpmCents: cpmArb,
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidCampaignArb, async (scenario) => {
        const { deps, auth, campaigns, counters } = makeHarness();
        // A genuinely valid Device_Auth_Token for the developer.
        const token = auth.mintToken(DEV);

        let targetId: string;
        if (scenario.type === "missing") {
          // Nothing seeded → getById returns null → 422.
          targetId = scenario.campaignId;
        } else {
          // Seeded but out of budget (budgetCents <= 0) → 422 (Requirement 2.8).
          targetId = "cmp-insufficient";
          campaigns.seed(
            fundedCampaign({
              id: targetId,
              budgetCents: scenario.budgetCents,
              cpmCents: scenario.cpmCents,
            }),
          );
        }

        const result = await recordImpression(deps, {
          token,
          campaignId: targetId,
        });

        expect(result).toEqual({
          ok: false,
          status: 422,
          error: INVALID_CAMPAIGN_ERROR,
        });
        // No money moved (Requirement 2.8): balance + budget deltas stay 0.
        expect(await counters.getBalanceCents(DEV)).toBe(0);
        expect(await counters.getBudgetCents(targetId)).toBe(0);
      }),
      RUNS,
    );
  });
});
