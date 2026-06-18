import { computeSplit, type Campaign, type User } from "@spinshare/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import {
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
} from "@/server/adapters/memory";

import { POST } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
  "SPINSHARE_FLUSH_SECRET",
  "CRON_SECRET",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  process.env.SPINSHARE_FLUSH_SECRET = "flush_secret";
  delete process.env.CRON_SECRET;
  resetContainer();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = savedEnv[k];
    }
  }
  resetContainer();
});

function flushRequest(secret?: string): Request {
  return new Request("https://test.local/api/internal/flush", {
    method: "POST",
    ...(secret !== undefined
      ? { headers: { authorization: `Bearer ${secret}` } }
      : {}),
  });
}

function seedUser(container: Container, user: Partial<User> = {}): User {
  const seeded: User = {
    id: "dev_1",
    email: "dev@example.test",
    provider: "github",
    role: "developer",
    balanceCents: 0,
    ...user,
  };
  (container.users as MemoryUserRepository).seed(seeded);
  return seeded;
}

function seedCampaign(
  container: Container,
  campaign: Partial<Campaign> = {},
): Campaign {
  const seeded: Campaign = {
    id: "cmp_1",
    advertiserId: "adv_1",
    adText: "Study exactly what matters",
    cpmCents: 3000,
    budgetCents: 1000,
    status: "active",
    createdAtMs: 0,
    ...campaign,
  };
  (container.campaigns as MemoryCampaignRepository).seed(seeded);
  return seeded;
}

async function enqueueImpression(container: Container): Promise<number> {
  const split = computeSplit(3000);
  await (container.counters as MemoryCounterStore).applyImpression({
    developerId: "dev_1",
    campaignId: "cmp_1",
    entryId: "entry_1",
    split,
    occurredAtMs: 123,
  });
  return split.developerCreditCents;
}

describe("POST /api/internal/flush", () => {
  it("fails closed when no flush secret is configured", async () => {
    delete process.env.SPINSHARE_FLUSH_SECRET;
    delete process.env.CRON_SECRET;

    const response = await POST(flushRequest("flush_secret"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "flush_secret_not_configured" });
  });

  it("rejects missing bearer auth without draining pending work", async () => {
    const container = getContainer();
    seedUser(container);
    seedCampaign(container);
    await enqueueImpression(container);

    const response = await POST(flushRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect((container.ledger as MemoryLedgerRepository).all()).toEqual([]);

    const authorized = await POST(flushRequest("flush_secret"));
    expect(authorized.status).toBe(200);
    expect((container.ledger as MemoryLedgerRepository).all()).toHaveLength(1);
  });

  it("runs one flush cycle and makes credited impressions durable", async () => {
    const container = getContainer();
    seedUser(container);
    seedCampaign(container);
    const developerCreditCents = await enqueueImpression(container);

    const response = await POST(flushRequest("flush_secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      drained: 1,
      flushed: true,
      balanceDeltaCentsByUser: { dev_1: developerCreditCents },
      budgetDeltaCentsByCampaign: { cmp_1: -3 },
    });
    await expect(container.ledger.listByDeveloper("dev_1")).resolves.toEqual([
      expect.objectContaining({
        entryId: "entry_1",
        developerId: "dev_1",
        campaignId: "cmp_1",
        developerCreditCents,
      }),
    ]);
    await expect(container.users.getById("dev_1")).resolves.toEqual(
      expect.objectContaining({ balanceCents: developerCreditCents }),
    );
    await expect(container.campaigns.getById("cmp_1")).resolves.toEqual(
      expect.objectContaining({ budgetCents: 997 }),
    );
  });
});
