/**
 * Integration tests for `/api/webhooks/stripe` focused on the **signature**
 * boundary (task 10.6).
 *
 * The light `route.test.ts` already covers the happy path, idempotency, and a
 * garbage-signature 400. This suite drills into the byte-exact signature
 * contract end-to-end against the real composition-root container:
 *
 *   - A correctly signed `checkout.session.completed` payload credits the
 *     campaign budget by exactly `amountCents`, once, and returns 200 (R9.8).
 *   - A *tampered* payload — a body that was signed as event A but delivered as
 *     event B while reusing A's (now stale) signature — is rejected with 400 and
 *     leaves every campaign budget untouched (R9.10).
 *   - A request with no signature header at all is likewise rejected with 400
 *     and no mutation (R9.10).
 *
 * Because verification is HMAC-over-raw-bytes, "tampering" is exercised by
 * mutating the raw body after signing rather than re-signing it.
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

/** Builds a webhook request from raw bytes + a signature header. */
function webhookRequest(rawBody: Buffer, signature: string | null): Request {
  const headers: Record<string, string> = {};
  if (signature !== null) {
    headers["stripe-signature"] = signature;
  }
  return new Request("https://test.local/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: new Uint8Array(rawBody),
  });
}

/** Builds a correctly signed webhook request for the given event. */
function signedRequest(event: StripeEvent): Request {
  // The default mock signing secret matches the container's gateway, so a
  // freshly constructed gateway produces a signature the route will accept.
  const { rawBody, signature } = new MockPaymentGateway().signPayload(event);
  return webhookRequest(rawBody, signature);
}

async function budgetOf(container: Container, id: string): Promise<number> {
  const campaign = await container.campaigns.getById(id);
  return campaign?.budgetCents ?? Number.NaN;
}

const FUNDING_TYPE = "checkout.session.completed";

describe("POST /api/webhooks/stripe — signature integration", () => {
  it("applies a valid signed funding payload exactly once (R9.8)", async () => {
    const container = getContainer();
    seedCampaign(container, "cmp1");
    const event: StripeEvent = {
      id: "evt_valid",
      type: FUNDING_TYPE,
      campaignId: "cmp1",
      amountCents: 12345,
    };

    const res = await POST(signedRequest(event));

    expect(res.status).toBe(200);
    // budget += amountCents, applied a single time.
    expect(await budgetOf(container, "cmp1")).toBe(12345);
  });

  it("rejects a tampered body that reuses another event's signature (R9.10)", async () => {
    const container = getContainer();
    seedCampaign(container, "cmpA");
    seedCampaign(container, "cmpB");

    // Sign event A — this yields a signature valid only for A's exact bytes.
    const eventA: StripeEvent = {
      id: "evt_A",
      type: FUNDING_TYPE,
      campaignId: "cmpA",
      amountCents: 5000,
    };
    const { signature: signatureForA } = new MockPaymentGateway().signPayload(
      eventA,
    );

    // Attacker swaps in a different body (event B, crediting a different
    // campaign a larger amount) while keeping A's stale signature.
    const eventB: StripeEvent = {
      id: "evt_B",
      type: FUNDING_TYPE,
      campaignId: "cmpB",
      amountCents: 999999,
    };
    const tamperedBody = Buffer.from(JSON.stringify(eventB), "utf8");

    const res = await POST(webhookRequest(tamperedBody, signatureForA));

    expect(res.status).toBe(400);
    // Neither the impersonated target nor any other campaign moved.
    expect(await budgetOf(container, "cmpA")).toBe(0);
    expect(await budgetOf(container, "cmpB")).toBe(0);
  });

  it("rejects a request with no signature header and applies no mutation (R9.10)", async () => {
    const container = getContainer();
    seedCampaign(container, "cmp1");
    const event: StripeEvent = {
      id: "evt_unsigned",
      type: FUNDING_TYPE,
      campaignId: "cmp1",
      amountCents: 7777,
    };
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");

    const res = await POST(webhookRequest(rawBody, null));

    expect(res.status).toBe(400);
    expect(await budgetOf(container, "cmp1")).toBe(0);
  });
});
