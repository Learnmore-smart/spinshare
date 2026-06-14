// Feature: spinshare-ad-exchange, Property 12: Verified payment increases budget by exactly the amount, once
//
// Property test for the `/api/webhooks/stripe` route (task 10.4). It asserts the
// universal funding invariant from design "Property 12":
//
//   For any verified Stripe payment event with amount A applied to a campaign,
//   the campaign budget increases by exactly A (R9.8); applying the same event
//   id any number of additional times leaves the budget unchanged after the
//   first application (R9.9).
//
// Strategy: generate an arbitrary funding `amountCents`, a campaign seeded at an
// arbitrary known starting budget, and a redelivery count N ≥ 1. Deliver the
// signed webhook once → assert 200 and `budget == start + amount`. Redeliver the
// SAME event id N more times → assert each still 200 and the budget never moves
// past the single application. Uses the credential-free local adapters via
// `resetContainer` + the same env-forcing harness as the route unit test.

import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import {
  MemoryCampaignRepository,
  MockPaymentGateway,
} from "@/server/adapters/memory";
import type { StripeEvent } from "@/server/ports";

import { POST } from "./route";

const RUNS = { numRuns: 100 } as const;

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  // Force the credential-free local adapters regardless of the ambient env.
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  resetContainer();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = savedEnv[k];
    }
  }
  resetContainer();
});

/** Seeds a campaign with an explicit starting budget into the memory repo. */
function seedCampaign(
  container: Container,
  id: string,
  startBudgetCents: number,
): void {
  const campaign: Campaign = {
    id,
    advertiserId: "adv1",
    adText: "Ship faster with Acme CI",
    cpmCents: 3000,
    budgetCents: startBudgetCents,
    status: "active",
    createdAtMs: 0,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

/** Builds a signed webhook request for the given event. */
function signedRequest(event: StripeEvent): Request {
  // The default mock signing secret matches the container's gateway, so a
  // freshly constructed gateway produces a signature the route will accept.
  const { rawBody, signature } = new MockPaymentGateway().signPayload(event);
  return new Request("https://test.local/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: new Uint8Array(rawBody),
  });
}

async function budgetOf(container: Container, id: string): Promise<number> {
  const campaign = await container.campaigns.getById(id);
  return campaign?.budgetCents ?? Number.NaN;
}

describe("Property 12: verified payment increases budget by exactly the amount, once", () => {
  it("credits exactly `amountCents` once, regardless of redelivery count", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Funding amount within the funding schema range (100–10,000,000 cents).
        fc.integer({ min: 100, max: 10_000_000 }),
        // Arbitrary known starting budget for the campaign.
        fc.integer({ min: 0, max: 10_000_000 }),
        // Number of EXTRA redeliveries of the same event id (≥1 redelivery).
        fc.integer({ min: 1, max: 5 }),
        // Distinct ids so each generated case is independent.
        fc.string({ minLength: 1, maxLength: 8 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
        async (amountCents, startBudgetCents, redeliveries, suffix) => {
          // Fresh container per case so prior runs never bleed budget/idempotency.
          resetContainer();
          const container = getContainer();
          const campaignId = `cmp_${suffix}`;
          const eventId = `evt_${suffix}`;
          seedCampaign(container, campaignId, startBudgetCents);

          const event: StripeEvent = {
            id: eventId,
            type: "checkout.session.completed",
            campaignId,
            amountCents,
          };

          // First (verified) delivery applies the increment exactly once (R9.8).
          const first = await POST(signedRequest(event));
          expect(first.status).toBe(200);
          const afterFirst = await budgetOf(container, campaignId);
          expect(afterFirst).toBe(startBudgetCents + amountCents);

          // Every subsequent redelivery of the SAME event id is a no-op on the
          // budget and still acknowledged with 200 (R9.9).
          for (let i = 0; i < redeliveries; i++) {
            const res = await POST(signedRequest(event));
            expect(res.status).toBe(200);
            expect(await budgetOf(container, campaignId)).toBe(afterFirst);
          }
        },
      ),
      RUNS,
    );
  });
});
