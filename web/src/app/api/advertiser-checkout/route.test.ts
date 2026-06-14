import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getContainer,
  resetContainer,
} from "@/server/container";

import { POST } from "./route";

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
  it("creates a zero-budget campaign with private leaderboard metadata and returns checkout", async () => {
    const response = await POST(request(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/mock\.spinshare\.local\/checkout\//);
    expect(body.sessionId).toMatch(/^cs_/);
    expect(body.amountCents).toBe(1500);
    expect(body.campaign).toMatchObject({
      adText: validPayload.adText,
      cpmCents: validPayload.cpmCents,
      budgetCents: 0,
      contactEmail: "ads@example.com",
      destinationUrl: "https://linear.app/",
      brandName: "Linear",
      publicOnLeaderboard: false,
    });

    const stored = await getContainer().campaigns.getById(body.campaign.id);
    expect(stored).toMatchObject({
      contactEmail: "ads@example.com",
      publicOnLeaderboard: false,
      budgetCents: 0,
    });
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
