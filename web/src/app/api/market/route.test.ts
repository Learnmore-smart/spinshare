import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import { MemoryCampaignRepository } from "@/server/adapters/memory";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_REDIS",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_REDIS = "memory";
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
    adText: "Live developer tool ad",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

describe("GET /api/market", () => {
  it("returns biddable campaigns sorted by auction priority", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_low", cpmCents: 500 });
    seedCampaign(container, { id: "cmp_top", cpmCents: 2200, adText: "Top bidder" });
    seedCampaign(container, { id: "cmp_unfunded", cpmCents: 9000, budgetCents: 0 });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      liveCampaigns: 2,
      topCpmCents: 2200,
      topCpmUsd: "$22.00",
    });
    expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
      "cmp_top",
      "cmp_low",
    ]);
    expect(body.rows[0]).toMatchObject({
      adText: "Top bidder",
      bidLabel: "$22.00 / 1k imps",
      status: "live",
    });
    expect(body.rows.some((row: { id: string }) => row.id === "cmp_unfunded")).toBe(
      false,
    );
  });

  it("omits private leaderboard campaigns from the public market", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_public", cpmCents: 1200 });
    seedCampaign(container, {
      id: "cmp_private",
      cpmCents: 9000,
      publicOnLeaderboard: false,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.liveCampaigns).toBe(1);
    expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
      "cmp_public",
    ]);
  });
});
