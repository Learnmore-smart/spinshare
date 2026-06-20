import { computeSplit, type Campaign, type User } from "@spinshare/core";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
} from "./adapters/memory";
import type { Container } from "./container";
import { flushPendingForRead } from "./flush-before-read";

function makeContainer(): Container {
  const counters = new MemoryCounterStore();
  const campaigns = new MemoryCampaignRepository();
  const users = new MemoryUserRepository();
  const ledger = new MemoryLedgerRepository();

  return {
    counters,
    campaigns,
    users,
    ledger,
  } as Pick<Container, "counters" | "campaigns" | "users" | "ledger"> as Container;
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

describe("flushPendingForRead", () => {
  it("makes pending impression credits durable before account reads", async () => {
    const container = makeContainer();
    seedUser(container);
    seedCampaign(container);
    const developerCreditCents = await enqueueImpression(container);

    await flushPendingForRead(container, "test-read");

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

  it("does not throw when the best-effort flush cannot durably write", async () => {
    const container = makeContainer();
    seedUser(container);
    seedCampaign(container);
    await enqueueImpression(container);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingContainer = {
      ...container,
      ledger: {
        appendEntries: vi.fn().mockRejectedValue(new Error("db down")),
        getByEntryId: container.ledger.getByEntryId.bind(container.ledger),
        appendEntryIfAbsent: container.ledger.appendEntryIfAbsent.bind(
          container.ledger,
        ),
        listByDeveloper: container.ledger.listByDeveloper.bind(
          container.ledger,
        ),
        countByCampaignIds: container.ledger.countByCampaignIds.bind(
          container.ledger,
        ),
        summarizeFleet: container.ledger.summarizeFleet.bind(container.ledger),
      },
    } as Container;

    await expect(
      flushPendingForRead(failingContainer, "test-read"),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      "[flush-before-read] pending flush failed for test-read:",
      expect.any(Error),
    );
    await expect(container.users.getById("dev_1")).resolves.toEqual(
      expect.objectContaining({ balanceCents: 0 }),
    );
    warn.mockRestore();
  });
});
