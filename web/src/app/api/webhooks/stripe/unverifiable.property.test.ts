/**
 * Property-based test for the `/api/webhooks/stripe` route (task 10.5).
 *
 * Complements the example cases in `route.test.ts` by quantifying the
 * "bad signature" branch across a wide space of *unverifiable* deliveries:
 * random signatures, tampered bodies carrying a stale (valid-for-something-else)
 * signature, and a missing signature header. For every such request the route
 * must reject with `400` and leave the seeded campaign budget untouched.
 *
 *   - Property 13: Unverifiable webhooks never mutate budget (Requirement 9.10).
 *
 * Runs with fast-check `{ numRuns: 100 }`.
 */

import { createHmac } from "node:crypto";
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

const CAMPAIGN_ID = "cmp1";
/** Known, non-zero starting budget so any mutation would be observable. */
const SEED_BUDGET_CENTS = 12345;

/**
 * The mock gateway's default signing secret (see `MockPaymentGateway`). We use
 * it here only to compute the *correct* signature for a body so we can assert
 * the generated "bad" signature really differs (defends against an arbitrary
 * generator accidentally producing a valid HMAC).
 */
const WEBHOOK_SECRET = "whsec_mock_spinshare_local";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_REDIS",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  // Force the credential-free local adapters regardless of the ambient env.
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_REDIS = "memory";
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

/** Seeds a known-budget active campaign into the container's memory repo. */
function seedCampaign(container: Container): void {
  const campaign: Campaign = {
    id: CAMPAIGN_ID,
    advertiserId: "adv1",
    adText: "Ship faster with Acme CI",
    cpmCents: 3000,
    budgetCents: SEED_BUDGET_CENTS,
    status: "active",
    createdAtMs: 0,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

async function budgetOf(container: Container): Promise<number> {
  const campaign = await container.campaigns.getById(CAMPAIGN_ID);
  return campaign?.budgetCents ?? Number.NaN;
}

/** Byte-exact valid signature the route would accept for `rawBody`. */
function validSignature(rawBody: Buffer): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

/** A funding-shaped event targeting the seeded campaign. */
const eventArb: fc.Arbitrary<StripeEvent> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 24 }),
  type: fc.constant("checkout.session.completed"),
  campaignId: fc.constant(CAMPAIGN_ID),
  amountCents: fc.integer({ min: 1, max: 10_000_000 }),
});

/**
 * The space of *unverifiable* deliveries. Each variant yields the raw body to
 * send plus a signature that is NOT a valid HMAC for that body:
 *   - `randomHex`  — a random hex string in the signature shape.
 *   - `arbitrary`  — an arbitrary string (covers junk / wrong-format headers).
 *   - `missing`    — no/empty signature header.
 *   - `stale`      — a valid signature, but for a *different* tampered event.
 */
type BadDelivery = { rawBody: Buffer; signature: string };

const badDeliveryArb: fc.Arbitrary<BadDelivery> = fc.oneof(
  // Random hex string (looks like a signature but is essentially never valid).
  eventArb.chain((event) => {
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");
    return fc
      .hexaString({ minLength: 0, maxLength: 80 })
      .map((signature) => ({ rawBody, signature }));
  }),
  // Arbitrary junk string as the signature header.
  eventArb.chain((event) => {
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");
    return fc.string({ maxLength: 80 }).map((signature) => ({ rawBody, signature }));
  }),
  // Missing signature header entirely.
  eventArb.map((event) => ({
    rawBody: Buffer.from(JSON.stringify(event), "utf8"),
    signature: "",
  })),
  // Tampered body: a valid signature computed for a *different* event is sent
  // alongside the original body, so verification must fail.
  fc
    .tuple(eventArb, fc.integer({ min: 1, max: 10_000_000 }))
    .map(([event, otherAmount]) => {
      const sentBody = Buffer.from(JSON.stringify(event), "utf8");
      const tampered: StripeEvent = {
        ...event,
        // Guarantee a different serialized body (hence a different signature).
        amountCents: event.amountCents === otherAmount ? otherAmount + 1 : otherAmount,
      };
      const staleSignature = validSignature(
        Buffer.from(JSON.stringify(tampered), "utf8"),
      );
      return { rawBody: sentBody, signature: staleSignature };
    }),
);

function buildRequest(delivery: BadDelivery): Request {
  const headers: Record<string, string> = {};
  // Only attach the header when present, so the "missing" variant truly omits it.
  if (delivery.signature !== "") {
    headers["stripe-signature"] = delivery.signature;
  }
  return new Request("https://test.local/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: new Uint8Array(delivery.rawBody),
  });
}

describe("POST /api/webhooks/stripe — unverifiable webhook properties", () => {
  // Feature: spinshare-ad-exchange, Property 13: Unverifiable webhooks never mutate budget
  // Validates: Requirements 9.10
  it("Property 13: any signature-failing webhook is rejected with 400 and never mutates the budget", async () => {
    await fc.assert(
      fc.asyncProperty(badDeliveryArb, async (delivery) => {
        // Defend against the astronomically-unlikely case of a generator
        // producing the genuinely valid signature for this body.
        fc.pre(delivery.signature !== validSignature(delivery.rawBody));

        // Fresh container + known budget per run for full isolation.
        resetContainer();
        const container = getContainer();
        seedCampaign(container);

        const res = await POST(buildRequest(delivery));

        expect(res.status).toBe(400);
        expect(await budgetOf(container)).toBe(SEED_BUDGET_CENTS);
      }),
      RUNS,
    );
  });
});
