import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import { MemoryCampaignRepository } from "@/server/adapters/memory";
import { mintClickToken } from "@/server/click-token";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

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

function seedCampaign(
  container: Container,
  overrides: Partial<Campaign> & Pick<Campaign, "id">,
): void {
  const campaign: Campaign = {
    advertiserId: "adv1",
    adText: "Try Linear for issue tracking",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

describe("GET /api/click", () => {
  it("increments click telemetry only with a valid signed click token", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_click",
      destinationUrl: "https://linear.app/",
    });
    const clickToken = mintClickToken({
      campaignId: "cmp_click",
      developerId: "dev_1",
      nowMs: Date.now(),
    });

    const response = await GET(
      new Request(
        `https://spinshare.test/api/click?campaignId=cmp_click&clickToken=${encodeURIComponent(clickToken)}`,
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://linear.app/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_click"]);
    expect(telemetry["cmp_click"]!.clicks).toBe(1);
  });

  it("counts a replayed click token only once (single-use)", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_click",
      destinationUrl: "https://linear.app/",
    });
    const clickToken = mintClickToken({
      campaignId: "cmp_click",
      developerId: "dev_1",
      nowMs: Date.now(),
    });
    const clickUrl = `https://spinshare.test/api/click?campaignId=cmp_click&clickToken=${encodeURIComponent(clickToken)}`;

    const first = await GET(new Request(clickUrl));
    const second = await GET(new Request(clickUrl));

    // Both redirect (UX preserved) but the replay does not inflate the counter.
    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    expect(second.headers.get("location")).toBe("https://linear.app/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_click"]);
    expect(telemetry["cmp_click"]!.clicks).toBe(1);
  });

  it("redirects but does not count clicks when the signed token is missing", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_click",
      destinationUrl: "https://linear.app/",
    });

    const response = await GET(
      new Request("https://spinshare.test/api/click?campaignId=cmp_click"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://linear.app/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_click"]);
    expect(telemetry["cmp_click"]!.clicks).toBe(0);
  });

  it("redirects but does not count clicks when the signed token is for another campaign", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_click",
      destinationUrl: "https://linear.app/",
    });
    const clickToken = mintClickToken({
      campaignId: "cmp_other",
      developerId: "dev_1",
      nowMs: 1_700_000_000_000,
    });

    const response = await GET(
      new Request(
        `https://spinshare.test/api/click?campaignId=cmp_click&clickToken=${encodeURIComponent(clickToken)}`,
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://linear.app/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_click"]);
    expect(telemetry["cmp_click"]!.clicks).toBe(0);
  });

  it("does not count clicks for campaigns without a destination", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_plain" });

    const response = await GET(
      new Request("https://spinshare.test/api/click?campaignId=cmp_plain"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://spinshare.test/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_plain"]);
    expect(telemetry["cmp_plain"]!.clicks).toBe(0);
  });

  it("does not redirect or count clicks for unsafe historical destinations", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_unsafe",
      destinationUrl: "https://localhost/",
    });

    const response = await GET(
      new Request("https://spinshare.test/api/click?campaignId=cmp_unsafe"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://spinshare.test/");
    const telemetry = await container.counters.getCampaignTelemetry(["cmp_unsafe"]);
    expect(telemetry["cmp_unsafe"]!.clicks).toBe(0);
  });
});
