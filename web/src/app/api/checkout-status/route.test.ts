import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MemoryActivityRepository } from "@/server/adapters/memory";
import { getContainer, resetContainer } from "@/server/container";
import type {
  CheckoutInput,
  CheckoutSessionFunding,
  CheckoutSessionResult,
  PaymentGateway,
  StripeEvent,
} from "@/server/ports/payment-gateway";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

function checkoutStatusRequest(query = ""): Request {
  return new Request(`https://spinshare.test/api/checkout-status${query}`);
}

class CheckoutLookupGateway implements PaymentGateway {
  constructor(
    private readonly sessions: Record<string, CheckoutSessionFunding>,
  ) {}

  async createCheckoutSession(
    _input: CheckoutInput,
  ): Promise<CheckoutSessionResult> {
    throw new Error("not used");
  }

  verifyAndParseWebhook(_rawBody: Buffer, _signature: string): StripeEvent {
    throw new Error("not used");
  }

  async retrieveCheckoutSessionFunding(
    sessionId: string,
  ): Promise<CheckoutSessionFunding | null> {
    return this.sessions[sessionId] ?? null;
  }
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  resetContainer();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  resetContainer();
});

describe("GET /api/checkout-status", () => {
  it("rejects missing or malformed checkout session ids", async () => {
    const missing = await GET(checkoutStatusRequest());
    const malformed = await GET(
      checkoutStatusRequest("?checkout_session_id=not-a-session"),
    );

    await expect(missing.json()).resolves.toMatchObject({
      error: "invalid_checkout_session_id",
    });
    expect(missing.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      error: "invalid_checkout_session_id",
    });
    expect(malformed.status).toBe(400);
  });

  it("returns unknown when no checkout activity has been recorded", async () => {
    const response = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_missing"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      sessionId: "cs_missing",
      status: "unknown",
    });
  });

  it("returns pending_webhook for a created checkout without funding", async () => {
    const container = getContainer();
    const campaign = await container.campaigns.create({
      advertiserId: "adv_1",
      adText: "Pending checkout campaign",
      cpmCents: 500,
    });
    await (container.activities as MemoryActivityRepository).record({
      activityId: "checkoutStarted_cs_pending",
      campaignId: campaign.id,
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_pending",
      createdAtMs: 1000,
    });

    const response = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_pending"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: "cs_pending",
      status: "pending_webhook",
      campaign: {
        id: campaign.id,
        budgetCents: 0,
        publicOnLeaderboard: true,
        biddable: false,
        leaderboardEligible: false,
      },
    });
  });

  it("returns funded with leaderboard eligibility after budget is applied", async () => {
    const container = getContainer();
    const campaign = await container.campaigns.create({
      advertiserId: "adv_1",
      adText: "Funded checkout campaign",
      cpmCents: 500,
    });
    await container.campaigns.applyBudgetDeltaCents(campaign.id, 500);
    const activities = container.activities as MemoryActivityRepository;
    await activities.record({
      activityId: "checkoutStarted_cs_funded",
      campaignId: campaign.id,
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_funded",
      createdAtMs: 1000,
    });
    await activities.record({
      activityId: "payment_evt_funded",
      campaignId: campaign.id,
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "budgetFunded",
      amountCents: 500,
      amountUsd: "5.00",
      providerEventId: "evt_funded",
      checkoutSessionId: "cs_funded",
      createdAtMs: 2000,
    });

    const response = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_funded"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: "cs_funded",
      status: "funded",
      campaign: {
        id: campaign.id,
        budgetCents: 500,
        publicOnLeaderboard: true,
        biddable: true,
        leaderboardEligible: true,
      },
    });
  });

  it("reconciles a paid checkout session when the webhook has not arrived yet", async () => {
    const container = getContainer();
    const campaign = await container.campaigns.create({
      advertiserId: "adv_1",
      adText: "Paid checkout campaign",
      cpmCents: 500,
    });
    await (container.activities as MemoryActivityRepository).record({
      activityId: "checkoutStarted_cs_reconcile",
      campaignId: campaign.id,
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_reconcile",
      createdAtMs: 1000,
    });
    container.payments = new CheckoutLookupGateway({
      cs_reconcile: {
        sessionId: "cs_reconcile",
        status: "paid",
        campaignId: campaign.id,
        amountCents: 500,
        purchasedImpressions: 1_000,
      },
    });

    const response = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_reconcile"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      sessionId: "cs_reconcile",
      status: "funded",
      campaign: {
        id: campaign.id,
        budgetCents: 500,
        biddable: true,
        leaderboardEligible: true,
      },
    });
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 500,
      purchasedImpressions: 1_000,
    });
    expect((container.activities as MemoryActivityRepository).all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "budgetFunded",
          checkoutSessionId: "cs_reconcile",
        }),
      ]),
    );

    const repeat = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_reconcile"),
    );
    expect(repeat.status).toBe(200);
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 500,
      purchasedImpressions: 1_000,
    });
  });

  it("does not reconcile a paid checkout session for a different campaign", async () => {
    const container = getContainer();
    const campaign = await container.campaigns.create({
      advertiserId: "adv_1",
      adText: "Mismatched checkout campaign",
      cpmCents: 500,
    });
    await (container.activities as MemoryActivityRepository).record({
      activityId: "checkoutStarted_cs_mismatch",
      campaignId: campaign.id,
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_mismatch",
      createdAtMs: 1000,
    });
    container.payments = new CheckoutLookupGateway({
      cs_mismatch: {
        sessionId: "cs_mismatch",
        status: "paid",
        campaignId: "cmp_other",
        amountCents: 500,
      },
    });

    const response = await GET(
      checkoutStatusRequest("?checkout_session_id=cs_mismatch"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("pending_webhook");
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 0,
    });
  });
});
