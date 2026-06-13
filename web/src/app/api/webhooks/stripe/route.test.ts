/**
 * Unit tests for the `/api/webhooks/stripe` route (task 10.3).
 *
 * Covers the three observable behaviors of the handler against the in-memory
 * container (mock gateway + memory paymentEvents store + memory campaign repo):
 *   1. A verified `checkout.session.completed` event credits the campaign budget
 *      by exactly `amountCents` and returns `200` (R9.8).
 *   2. Redelivering the same event id is idempotent — still `200`, budget
 *      unchanged (R9.9).
 *   3. A bad signature returns `400` with no mutation (R9.10).
 *
 * The dedicated property tests live in tasks 10.4–10.6; this is the light
 * example-level check.
 */

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

/** Seeds a funded-but-zero-budget campaign into the container's memory repo. */
function seedCampaign(container: Container, id: string): void {
  const campaign: Campaign = {
    id,
    advertiserId: "adv1",
    adText: "Ship faster with Acme CI",
    cpmCents: 3000,
    budgetCents: 0,
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

describe("POST /api/webhooks/stripe", () => {
  it("credits the campaign budget once for a verified funding event", async () => {
    const container = getContainer();
    seedCampaign(container, "cmp1");
    const event: StripeEvent = {
      id: "evt_1",
      type: "checkout.session.completed",
      campaignId: "cmp1",
      amountCents: 5000,
    };

    const res = await POST(signedRequest(event));

    expect(res.status).toBe(200);
    expect(await budgetOf(container, "cmp1")).toBe(5000);
  });

  it("is idempotent across redelivery of the same event id", async () => {
    const container = getContainer();
    seedCampaign(container, "cmp1");
    const event: StripeEvent = {
      id: "evt_dup",
      type: "checkout.session.completed",
      campaignId: "cmp1",
      amountCents: 2500,
    };

    const first = await POST(signedRequest(event));
    const second = await POST(signedRequest(event));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Applied exactly once despite two verified deliveries.
    expect(await budgetOf(container, "cmp1")).toBe(2500);
  });

  it("rejects a tampered/bad signature with 400 and no mutation", async () => {
    const container = getContainer();
    seedCampaign(container, "cmp1");
    const event: StripeEvent = {
      id: "evt_bad",
      type: "checkout.session.completed",
      campaignId: "cmp1",
      amountCents: 9999,
    };
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");
    const req = new Request("https://test.local/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "deadbeef" },
      body: new Uint8Array(rawBody),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await budgetOf(container, "cmp1")).toBe(0);
  });
});
