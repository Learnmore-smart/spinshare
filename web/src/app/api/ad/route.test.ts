import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import {
  MemoryCampaignRepository,
  MockAuthProvider,
} from "@/server/adapters/memory";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
  "NEXTAUTH_URL",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  delete process.env.NEXTAUTH_URL;
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

function seedCampaign(
  container: Container,
  overrides: Partial<Campaign> & Pick<Campaign, "id">,
): void {
  const campaign: Campaign = {
    advertiserId: "adv1",
    adText: "Try Linear for issue tracking",
    destinationUrl: "https://linear.app/",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

function adRequest(token?: string): Request {
  return new Request("https://spinshare.test/api/ad", {
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
}

describe("GET /api/ad telemetry", () => {
  it("requires a bearer token before bidding or telemetry", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_top" });

    const response = await GET(adRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_top"]);
    expect(telemetry["cmp_top"]!.shows).toBe(0);
  });

  it("rejects invalid bearer tokens before bidding or telemetry", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_top" });

    const response = await GET(adRequest("not-a-real-token"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_top"]);
    expect(telemetry["cmp_top"]!.shows).toBe(0);
  });

  it("increments shows and rewrites clickable destinations to tracked redirects", async () => {
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("dev_1");
    seedCampaign(container, { id: "cmp_top" });

    const response = await GET(adRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      adAvailable: true,
      campaignId: "cmp_top",
    });
    expect(body.destinationUrl).toMatch(
      /^https:\/\/spinshare\.test\/api\/click\?campaignId=cmp_top&clickToken=.+/,
    );
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_top"]);
    expect(telemetry["cmp_top"]!.shows).toBe(1);
    await expect(container.progress.getByDeveloper("dev_1")).resolves.toMatchObject({
      developerId: "dev_1",
      campaignId: "cmp_top",
      accumulatedViewDurationMs: 0,
    });
  });

  it("uses the configured public origin instead of Cloud Run's internal origin", async () => {
    process.env.NEXTAUTH_URL = "https://www.spinshare.dev";
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("dev_prod");
    seedCampaign(container, { id: "cmp_prod" });
    const request = new Request("http://0.0.0.0:8080/api/ad", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.destinationUrl).toMatch(
      /^https:\/\/www\.spinshare\.dev\/api\/click\?campaignId=cmp_prod&clickToken=.+/,
    );
  });

  it("returns an authenticated developer's pending campaign before normal bidding", async () => {
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("dev_1");
    seedCampaign(container, {
      id: "cmp_pending",
      adText: "Continue this ad",
      cpmCents: 1000,
    });
    seedCampaign(container, {
      id: "cmp_high",
      adText: "Higher bidder",
      cpmCents: 9000,
    });
    await container.progress.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_pending",
      viewDurationMs: 1000,
      nowMs: 10,
    });

    const response = await GET(adRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      adAvailable: true,
      campaignId: "cmp_pending",
      adText: "Continue this ad",
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
  });
});
