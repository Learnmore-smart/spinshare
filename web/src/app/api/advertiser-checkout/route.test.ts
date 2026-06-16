import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MemoryActivityRepository } from "@/server/adapters/memory";
import {
  getContainer,
  resetContainer,
} from "@/server/container";

import { POST } from "./route";
import { GET as getMarket } from "../market/route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

const validPayload = {
  email: "ads@example.com",
  adText: "Try Linear - issue tracking built for speed",
  destinationUrl: "https://linear.app/",
  brandName: "Linear",
  publicOnLeaderboard: false,
  cpmCents: 500,
  blockCount: 3,
};

function request(body: unknown): Request {
  return new Request("https://spinshare.test/api/advertiser-checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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

describe("POST /api/advertiser-checkout", () => {
  it("settles mock checkout immediately and preserves private leaderboard metadata", async () => {
    const response = await POST(request(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessionId).toMatch(/^cs_/);
    expect(body.url).toBe(
      `https://spinshare.test/?checkout=success&checkout_session_id=${body.sessionId}#bid-market`,
    );
    expect(body.amountCents).toBe(1500);
    expect(body.campaign).toMatchObject({
      adText: validPayload.adText,
      cpmCents: validPayload.cpmCents,
      budgetCents: 1500,
      contactEmail: "ads@example.com",
      destinationUrl: "https://linear.app/",
      brandName: "Linear",
      publicOnLeaderboard: false,
    });

    const stored = await getContainer().campaigns.getById(body.campaign.id);
    expect(stored).toMatchObject({
      contactEmail: "ads@example.com",
      publicOnLeaderboard: false,
      budgetCents: 1500,
    });
    expect((getContainer().activities as MemoryActivityRepository).all()).toEqual([
      expect.objectContaining({
        campaignId: body.campaign.id,
        type: "advertiser_event",
        status: "checkoutStarted",
        amountCents: 1500,
        amountUsd: "15.00",
        checkoutSessionId: body.sessionId,
      }),
      expect.objectContaining({
        campaignId: body.campaign.id,
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 1500,
        amountUsd: "15.00",
        checkoutSessionId: body.sessionId,
      }),
    ]);
  });

  it("shows a public mock checkout campaign in the market immediately after purchase", async () => {
    const response = await POST(
      request({ ...validPayload, publicOnLeaderboard: true }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);

    const marketResponse = await getMarket();
    const market = await marketResponse.json();

    expect(marketResponse.status).toBe(200);
    expect(market.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: body.campaign.id,
          adText: validPayload.adText,
          remainingBudgetCents: 1500,
          targetImpressions: 3000,
        }),
      ]),
    );
  });

  it("rejects invalid payloads before creating a checkout", async () => {
    const response = await POST(
      request({ ...validPayload, destinationUrl: "http://linear.app/" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});
