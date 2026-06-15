import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import {
  MemoryCampaignRepository,
  MemoryLedgerRepository,
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

function authRequest(token: string): Request {
  return new Request("https://spinshare.test/api/campaigns", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("GET /api/campaigns telemetry", () => {
  it("returns zero-filled telemetry for quiet campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_quiet" });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns[0]).toMatchObject({
      id: "cmp_quiet",
      telemetry: {
        shows: 0,
        clicks: 0,
        credited: 0,
        tooShort: 0,
        invalidToken: 0,
        invalidCampaign: 0,
        shadowBanned: 0,
        earningCapped: 0,
        duplicate: 0,
      },
    });
  });

  it("returns aggregate telemetry and durable credited counts for owned campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_live" });
    seedCampaign(container, { id: "cmp_other", advertiserId: "adv2" });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");
    await container.counters.incrementCampaignTelemetry("cmp_live", "shows");
    await container.counters.incrementCampaignTelemetry("cmp_live", "clicks");
    await container.counters.incrementCampaignTelemetry("cmp_live", "tooShort");
    (container.ledger as MemoryLedgerRepository).seed([
      {
        entryId: "entry-1",
        campaignId: "cmp_live",
        developerId: "dev-1",
        revenueMicrocents: 3000,
        developerCreditCents: 2,
        spinshareRetentionMicrocents: 998,
      },
    ]);

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0]).toMatchObject({
      id: "cmp_live",
      telemetry: {
        shows: 1,
        clicks: 1,
        credited: 1,
        tooShort: 1,
      },
    });
  });
});
