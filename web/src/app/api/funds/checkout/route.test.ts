import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MemoryActivityRepository,
  MockAuthProvider,
} from "@/server/adapters/memory";
import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { getContainer, resetContainer } from "@/server/container";

import { POST } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

function checkoutRequest(token: string, body: unknown): Request {
  return new Request("https://spinshare.test/api/funds/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
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

async function createCampaign(advertiserId: string, cpmCents = 500) {
  return getContainer().campaigns.create({
    advertiserId,
    adText: "Try SpinShare for Claude Code",
    destinationUrl: "https://spinshare.dev/",
    brandName: "SpinShare",
    cpmCents,
  });
}

describe("POST /api/funds/checkout", () => {
  it("funds an owned campaign through a settled mock checkout", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner");
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 5,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessionId).toMatch(/^cs_/);
    expect(body.url).toBe(
      `https://spinshare.test/dashboard/advertiser?funding=success&checkout_session_id=${body.sessionId}`,
    );
    expect(body.settled).toBe(true);
    expect(body.campaign).toMatchObject({
      id: campaign.id,
      budgetCents: 2500,
      cpmCents: 500,
      purchasedImpressions: 5_000,
    });

    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 2500,
      cpmCents: 500,
      purchasedImpressions: 5_000,
    });
    expect((container.activities as MemoryActivityRepository).all()).toEqual([
      expect.objectContaining({
        campaignId: campaign.id,
        advertiserId: "adv_owner",
        type: "advertiser_event",
        status: "checkoutStarted",
        amountCents: 2500,
        amountUsd: "25.00",
        checkoutSessionId: body.sessionId,
      }),
      expect.objectContaining({
        campaignId: campaign.id,
        advertiserId: "adv_owner",
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 2500,
        amountUsd: "25.00",
        checkoutSessionId: body.sessionId,
      }),
    ]);
  });

  it("updates CPM at checkout time and derives amount from the new CPM", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner", 500);
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 5,
        cpmCents: 700,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaign).toMatchObject({
      id: campaign.id,
      cpmCents: 700,
      budgetCents: 3500,
      purchasedImpressions: 5_000,
    });
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      cpmCents: 700,
      budgetCents: 3500,
      purchasedImpressions: 5_000,
    });
    expect((container.activities as MemoryActivityRepository).all()).toEqual([
      expect.objectContaining({
        status: "checkoutStarted",
        amountCents: 3500,
        amountUsd: "35.00",
      }),
      expect.objectContaining({
        status: "budgetFunded",
        amountCents: 3500,
        amountUsd: "35.00",
      }),
    ]);
  });

  it("rejects invalid checkout-time CPM before mutating the campaign", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner", 500);
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 5,
        cpmCents: 99,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("CPM bid must be at least $1.00");
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      cpmCents: 500,
      budgetCents: 0,
    });
    expect((container.activities as MemoryActivityRepository).all()).toEqual([]);
  });

  it("rejects funding for a campaign owned by another advertiser", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner");
    const token = (container.auth as MockAuthProvider).mintToken("adv_other");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 5,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 0,
    });
  });

  it("funds a homepage checkout campaign claimed by the authenticated email", async () => {
    const container = getContainer();
    const campaign = await createCampaign(
      publicAdvertiserIdForEmail("buyer@example.com"),
    );
    const token = (container.auth as MockAuthProvider).mintToken("google:buyer-123", {
      email: "Buyer@Example.com",
    });

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 2,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaign).toMatchObject({
      id: campaign.id,
      advertiserId: publicAdvertiserIdForEmail("buyer@example.com"),
      budgetCents: 1000,
    });
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 1000,
    });
  });

  it("rejects funding for a missing campaign", async () => {
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: "cmp_missing",
        blockCount: 5,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("campaign_not_found");
  });

  it("rejects legacy amount-based dashboard funding payloads", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner");
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        amountCents: 2500,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 0,
    });
  });

  it("rejects block purchases whose derived checkout total exceeds the funding maximum", async () => {
    const container = getContainer();
    const campaign = await createCampaign("adv_owner", 100_000);
    const token = (container.auth as MockAuthProvider).mintToken("adv_owner");

    const response = await POST(
      checkoutRequest(token, {
        campaignId: campaign.id,
        blockCount: 101,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Total checkout amount must be between $1.00 and $100,000.00",
    );
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 0,
    });
  });
});
