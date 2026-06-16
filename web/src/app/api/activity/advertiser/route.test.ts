import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MemoryActivityRepository,
  MockAuthProvider,
} from "@/server/adapters/memory";
import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { getContainer, resetContainer } from "@/server/container";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

function activityRequest(token?: string, query = ""): Request {
  return new Request(`https://spinshare.test/api/activity/advertiser${query}`, {
    headers:
      token === undefined ? undefined : { authorization: `Bearer ${token}` },
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

describe("GET /api/activity/advertiser", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await GET(activityRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns activity for campaigns owned by user id or claimed public email", async () => {
    const container = getContainer();
    const directCampaign = await container.campaigns.create({
      advertiserId: "adv-1",
      adText: "Direct campaign",
      cpmCents: 3000,
    });
    const publicCampaign = await container.campaigns.create({
      advertiserId: publicAdvertiserIdForEmail("buyer@example.com"),
      contactEmail: "buyer@example.com",
      adText: "Public checkout",
      cpmCents: 4000,
    });
    const otherCampaign = await container.campaigns.create({
      advertiserId: "adv-other",
      adText: "Other campaign",
      cpmCents: 5000,
    });

    const activities = container.activities as MemoryActivityRepository;
    await activities.record({
      activityId: "activity-direct",
      campaignId: directCampaign.id,
      advertiserId: "adv-1",
      developerId: "dev-1",
      status: "credited",
      viewDurationMs: 3000,
      revenueMicrocents: 3000,
      developerCreditCents: 2,
      createdAtMs: 1000,
    });
    await activities.record({
      activityId: "activity-public",
      campaignId: publicCampaign.id,
      advertiserId: publicCampaign.advertiserId,
      developerId: "dev-2",
      status: "tooShort",
      viewDurationMs: 900,
      revenueMicrocents: 0,
      developerCreditCents: 0,
      createdAtMs: 2000,
    });
    await activities.record({
      activityId: "activity-funded",
      campaignId: publicCampaign.id,
      advertiserId: publicCampaign.advertiserId,
      type: "advertiser_event",
      status: "budgetFunded",
      amountCents: 4000,
      amountUsd: "40.00",
      providerEventId: "evt_1",
      createdAtMs: 2500,
    });
    await activities.record({
      activityId: "activity-other",
      campaignId: otherCampaign.id,
      advertiserId: "adv-other",
      developerId: "dev-3",
      status: "credited",
      viewDurationMs: 3000,
      revenueMicrocents: 5000,
      developerCreditCents: 3,
      createdAtMs: 3000,
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv-1", {
      email: "Buyer@Example.com",
    });

    const response = await GET(activityRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activities).toEqual([
      {
        activityId: "activity-funded",
        campaignId: publicCampaign.id,
        advertiserId: publicCampaign.advertiserId,
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 4000,
        amountUsd: "40.00",
        providerEventId: "evt_1",
        createdAtMs: 2500,
      },
      {
        activityId: "activity-public",
        campaignId: publicCampaign.id,
        advertiserId: publicCampaign.advertiserId,
        developerId: "dev-2",
        type: "impression_attempt",
        status: "tooShort",
        viewDurationMs: 900,
        revenueMicrocents: 0,
        developerCreditCents: 0,
        developerCreditUsd: "0.00",
        createdAtMs: 2000,
      },
      {
        activityId: "activity-direct",
        campaignId: directCampaign.id,
        advertiserId: "adv-1",
        developerId: "dev-1",
        type: "impression_attempt",
        status: "credited",
        viewDurationMs: 3000,
        revenueMicrocents: 3000,
        developerCreditCents: 2,
        developerCreditUsd: "0.02",
        createdAtMs: 1000,
      },
    ]);
  });

  it("returns owned activity as newest-first bounded pages with a cursor", async () => {
    const container = getContainer();
    const campaign = await container.campaigns.create({
      advertiserId: "adv-1",
      adText: "Paged campaign",
      cpmCents: 3000,
    });
    const activities = container.activities as MemoryActivityRepository;
    for (const index of [1, 2, 3]) {
      await activities.record({
        activityId: `advertiser-page-${index}`,
        campaignId: campaign.id,
        advertiserId: "adv-1",
        developerId: `dev-${index}`,
        status: index === 1 ? "tooShort" : "credited",
        viewDurationMs: index * 1000,
        revenueMicrocents: 0,
        developerCreditCents: 0,
        createdAtMs: index * 1000,
      });
    }
    const token = (container.auth as MockAuthProvider).mintToken("adv-1");

    const firstResponse = await GET(activityRequest(token, "?limit=2"));
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.activities.map((row: { activityId: string }) => row.activityId)).toEqual([
      "advertiser-page-3",
      "advertiser-page-2",
    ]);
    expect(firstBody.nextCursor).toBe("2000:advertiser-page-2");

    const secondResponse = await GET(
      activityRequest(token, `?limit=2&cursor=${encodeURIComponent(firstBody.nextCursor)}`),
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.activities.map((row: { activityId: string }) => row.activityId)).toEqual([
      "advertiser-page-1",
    ]);
    expect(secondBody.nextCursor).toBeUndefined();
  });
});
