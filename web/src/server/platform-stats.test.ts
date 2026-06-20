import { describe, expect, it } from "vitest";

import {
  MemoryCampaignRepository,
  MemoryLedgerRepository,
  MemoryUserRepository,
  SequentialIdGenerator,
  SystemClock,
} from "./adapters/memory";
import { loadPlatformStats } from "./platform-stats";
import type { Campaign, User } from "@spinshare/core";

function seedDeveloper(users: MemoryUserRepository, partial: Partial<User> & Pick<User, "id">) {
  users.seed({
    id: partial.id,
    email: partial.email ?? `${partial.id}@test.com`,
    provider: partial.provider ?? "github",
    role: "developer",
    balanceCents: partial.balanceCents ?? 0,
    ...(partial.createdAtMs !== undefined ? { createdAtMs: partial.createdAtMs } : {}),
    ...(partial.stripeConnectAccountId !== undefined
      ? { stripeConnectAccountId: partial.stripeConnectAccountId }
      : {}),
  });
}

describe("loadPlatformStats", () => {
  it("aggregates developers, impressions, spend, and ad hours", async () => {
    const nowMs = Date.UTC(2026, 5, 20, 12, 0, 0);
    const users = new MemoryUserRepository(new SequentialIdGenerator());
    const campaigns = new MemoryCampaignRepository(new SystemClock());
    const ledger = new MemoryLedgerRepository();

    seedDeveloper(users, {
      id: "dev_1",
      balanceCents: 150,
      createdAtMs: nowMs - 2 * 86_400_000,
      stripeConnectAccountId: "acct_1",
    });
    seedDeveloper(users, {
      id: "dev_2",
      balanceCents: 50,
      createdAtMs: nowMs - 20 * 86_400_000,
    });
    users.seed({
      id: "adv_1",
      email: "adv@test.com",
      provider: "google",
      role: "advertiser",
      balanceCents: 0,
    });

    const campaign: Campaign = {
      id: "cmp_1",
      advertiserId: "adv_1",
      adText: "Ship faster",
      destinationUrl: "https://example.com",
      cpmCents: 5000,
      budgetCents: 1000,
      status: "active",
      createdAtMs: nowMs - 86_400_000,
    };
    campaigns.seed(campaign);

    await ledger.appendEntries([
      {
        entryId: "imp_1",
        campaignId: "cmp_1",
        developerId: "dev_1",
        revenueMicrocents: 5000,
        developerCreditCents: 3,
        spinshareRetentionMicrocents: 2000,
        createdAtMs: nowMs - 3_600_000,
      },
      {
        entryId: "imp_2",
        campaignId: "cmp_1",
        developerId: "dev_2",
        revenueMicrocents: 5000,
        developerCreditCents: 3,
        spinshareRetentionMicrocents: 2000,
        createdAtMs: nowMs - 1_800_000,
      },
      {
        entryId: "signup_bonus:dev_1",
        type: "signup_bonus",
        campaignId: "",
        developerId: "dev_1",
        revenueMicrocents: 0,
        developerCreditCents: 100,
        spinshareRetentionMicrocents: 0,
        creditCents: 100,
        createdAtMs: nowMs,
      },
    ]);

    const stats = await loadPlatformStats({
      users,
      campaigns,
      ledger,
      nowMs,
    });

    expect(stats.totalDevelopers).toBe(2);
    expect(stats.totalAdvertisers).toBe(1);
    expect(stats.developersLast7d).toBe(1);
    expect(stats.developersLast30d).toBe(2);
    expect(stats.connectedPayouts).toBe(1);
    // Lifetime developer earnings = ledger impression credits (3 + 3), NOT the
    // sum of mutable user balances (which also carried the $1.00 sign-up bonus).
    expect(stats.totalDeveloperEarningsCents).toBe(6);
    expect(stats.totalCreditedImpressions).toBe(2);
    expect(stats.adHoursServed).toBeCloseTo((2 * 3000) / 3_600_000);
    expect(stats.impressionsToday).toBe(2);
    expect(stats.liveCampaigns).toBe(1);
    expect(stats.topCpmCents).toBe(5000);
    expect(stats.advertiserSpendCents).toBe(10);
  });

  it("derives developers, earnings, and advertisers from durable activity when user docs are absent", async () => {
    // Regression: the headline metrics must not zero out when the `users`
    // collection has no developer/advertiser docs — e.g. after a canonical-id
    // migration prunes legacy developer docs, when impression credits land
    // under a device/JWT id with no durable record, or when advertisers fund
    // seed/checkout campaigns by email without ever creating a user doc. The
    // ledger and campaigns (append-only) remain the source of truth.
    const nowMs = Date.UTC(2026, 5, 20, 12, 0, 0);
    const users = new MemoryUserRepository(new SequentialIdGenerator()); // empty
    const campaigns = new MemoryCampaignRepository(new SystemClock());
    const ledger = new MemoryLedgerRepository();

    // Two seed-style campaigns from two distinct advertisers, no user docs.
    for (const [id, advertiserId, cpmCents] of [
      ["cmp-seed-cursor", "seed-cursor-advertiser", 1120],
      ["cmp-seed-learnx", "seed-learnx-advertiser", 560],
    ] as const) {
      campaigns.seed({
        id,
        advertiserId,
        adText: "Ad",
        cpmCents,
        budgetCents: 5600,
        status: "active",
        createdAtMs: nowMs - 86_400_000,
      });
    }

    // One developer earned today; their user doc does NOT exist.
    await ledger.appendEntries([
      {
        entryId: "imp_1",
        campaignId: "cmp-seed-cursor",
        developerId: "dev_orphan",
        revenueMicrocents: 11_200,
        developerCreditCents: 6,
        spinshareRetentionMicrocents: 4_480,
        createdAtMs: nowMs - 3_600_000,
      },
      // A sign-up bonus row marks a second developer who joined but never earned.
      {
        entryId: "signup_bonus:dev_joined",
        type: "signup_bonus",
        campaignId: "",
        developerId: "dev_joined",
        revenueMicrocents: 0,
        developerCreditCents: 100,
        spinshareRetentionMicrocents: 0,
        creditCents: 100,
        createdAtMs: nowMs,
      },
    ]);

    const stats = await loadPlatformStats({ users, campaigns, ledger, nowMs });

    // Developers and advertisers are counted from durable activity, not docs.
    expect(stats.totalDevelopers).toBe(2); // dev_orphan + dev_joined
    expect(stats.totalAdvertisers).toBe(2); // two distinct campaign advertisers
    expect(stats.totalDeveloperEarningsCents).toBe(6); // impression credit only
    expect(stats.earningsTodayCents).toBe(6);

    // The defining invariant the broken snapshot violated: lifetime earnings can
    // never be less than today's earnings (today ⊆ all-time).
    expect(stats.totalDeveloperEarningsCents).toBeGreaterThanOrEqual(
      stats.earningsTodayCents,
    );

    // Onboarding metrics legitimately stay 0 without durable developer docs —
    // honest, not contradictory.
    expect(stats.developersLast7d).toBe(0);
    expect(stats.connectedPayouts).toBe(0);
  });
});
