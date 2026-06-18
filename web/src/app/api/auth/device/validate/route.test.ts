import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

function seedCampaign(container: Container): void {
  (container.campaigns as MemoryCampaignRepository).seed({
    id: "cmp_validate_should_not_show",
    advertiserId: "adv1",
    adText: "Should not increment on token validation",
    destinationUrl: "https://example.test",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
  });
}

function validateRequest(token?: string): Request {
  return new Request("https://spinshare.test/api/auth/device/validate", {
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
}

describe("GET /api/auth/device/validate", () => {
  it("returns valid:true for a valid bearer token without ad telemetry side effects", async () => {
    const container = getContainer();
    seedCampaign(container);
    const token = (container.auth as MockAuthProvider).mintToken("dev_1");

    const response = await GET(validateRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true });
    const telemetry = await container.counters.getCampaignTelemetry([
      "cmp_validate_should_not_show",
    ]);
    expect(telemetry["cmp_validate_should_not_show"]!.shows).toBe(0);
  });

  it("returns 401 valid:false for missing or invalid bearer tokens", async () => {
    const missing = await GET(validateRequest());
    const invalid = await GET(validateRequest("not-a-real-token"));

    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ valid: false });
    expect(invalid.status).toBe(401);
    await expect(invalid.json()).resolves.toEqual({ valid: false });
  });
});
