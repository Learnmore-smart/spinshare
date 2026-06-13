/**
 * Unit tests for the in-memory / mock adapters (task 4.3).
 *
 * These exercise the deterministic behavior the later services rely on:
 * atomic impression application + idempotency, velocity windows, shadow-ban
 * TTL, drain/ack reconciliation, idempotent ledger writes, webhook signature
 * verification, and the mock device-auth flow.
 */

import { describe, expect, it } from "vitest";
import { computeSplit } from "@spinshare/core";
import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
  MockAuthProvider,
  MockPaymentGateway,
  SequentialIdGenerator,
} from "./index";

const CPM = 3000; // $30 → revenue 3000 microcents (3¢), developer credit 2¢.

describe("MemoryCounterStore.applyImpression", () => {
  it("credits balance, decrements budget, and enqueues a ledger entry atomically", async () => {
    const store = new MemoryCounterStore(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    const split = computeSplit(CPM);

    const result = await store.applyImpression({
      developerId: "dev1",
      campaignId: "cmp1",
      entryId: "entry1",
      split,
      occurredAtMs: 0,
    });

    expect(result.applied).toBe(true);
    expect(result.balanceCents).toBe(split.developerCreditCents);
    expect(await store.getBalanceCents("dev1")).toBe(split.developerCreditCents);
    expect(await store.getBudgetCents("cmp1")).toBe(-3);
  });

  it("is idempotent by entryId (never moves money twice)", async () => {
    const store = new MemoryCounterStore(new ManualClock(0), new SequentialIdGenerator());
    const split = computeSplit(CPM);
    const input = {
      developerId: "dev1",
      campaignId: "cmp1",
      entryId: "entry1",
      split,
      occurredAtMs: 0,
    };

    await store.applyImpression(input);
    const second = await store.applyImpression(input);

    expect(second.applied).toBe(false);
    expect(await store.getBalanceCents("dev1")).toBe(split.developerCreditCents);
  });
});

describe("MemoryCounterStore velocity + shadow-ban", () => {
  it("counts impressions within a fixed window and resets after expiry", async () => {
    const clock = new ManualClock(0);
    const store = new MemoryCounterStore(clock, new SequentialIdGenerator());

    expect(await store.incrementVelocity("dev1", 100)).toBe(1);
    expect(await store.incrementVelocity("dev1", 100)).toBe(2);

    // Window (start 100s) expires at (100+60)*1000 ms.
    clock.setMs(160_000);
    expect(await store.incrementVelocity("dev1", 100)).toBe(1);
  });

  it("applies a shadow-ban that auto-restores after its TTL", async () => {
    const clock = new ManualClock(0);
    const store = new MemoryCounterStore(clock, new SequentialIdGenerator());

    await store.setShadowBan("dev1", 3600);
    expect(await store.isShadowBanned("dev1")).toBe(true);

    clock.advanceSeconds(3600);
    expect(await store.isShadowBanned("dev1")).toBe(false);
  });
});

describe("MemoryCounterStore drain/ack reconciliation", () => {
  it("drains pending entries then subtracts deltas on ack", async () => {
    const store = new MemoryCounterStore(new ManualClock(0), new SequentialIdGenerator());
    const ledger = new MemoryLedgerRepository();
    const split = computeSplit(CPM);

    await store.applyImpression({
      developerId: "dev1",
      campaignId: "cmp1",
      entryId: "entry1",
      split,
      occurredAtMs: 0,
    });

    const batch = await store.drainPending(10);
    expect(batch.entries).toHaveLength(1);
    expect(batch.balanceDeltaCentsByUser.dev1).toBe(split.developerCreditCents);
    expect(batch.budgetDeltaCentsByCampaign.cmp1).toBe(-3);

    await ledger.appendEntries(batch.entries);
    await ledger.appendEntries(batch.entries); // idempotent retry
    expect(ledger.size).toBe(1);

    // Deltas remain pending until the durable write is acked.
    expect(await store.getBalanceCents("dev1")).toBe(split.developerCreditCents);
    await store.ackDrained(batch.batchToken);
    expect(await store.getBalanceCents("dev1")).toBe(0);
    expect(await store.getBudgetCents("cmp1")).toBe(0);
  });
});

describe("MemoryCampaignRepository", () => {
  it("creates campaigns at zero budget and lists biddable ones", async () => {
    const repo = new MemoryCampaignRepository(new ManualClock(1234), new SequentialIdGenerator());
    const created = await repo.create({ advertiserId: "adv1", adText: "Hi", cpmCents: CPM });

    expect(created.budgetCents).toBe(0);
    expect(created.createdAtMs).toBe(1234);
    expect(await repo.listBiddable()).toHaveLength(0); // zero budget → not biddable

    await repo.applyBudgetDeltaCents(created.id, 5000);
    expect(await repo.listBiddable()).toHaveLength(1);
  });
});

describe("MockPaymentGateway", () => {
  it("verifies a correctly-signed webhook and rejects a tampered one", () => {
    const gw = new MockPaymentGateway(new SequentialIdGenerator());
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      campaignId: "cmp1",
      amountCents: 5000,
    };
    const { rawBody, signature } = gw.signPayload(event);

    expect(gw.verifyAndParseWebhook(rawBody, signature)).toEqual(event);
    expect(() => gw.verifyAndParseWebhook(rawBody, "deadbeef")).toThrow();
  });
});

describe("MockAuthProvider device flow", () => {
  it("walks pending → slow_down → approved and validates the minted token", async () => {
    const clock = new ManualClock(0);
    const auth = new MockAuthProvider(clock, new SequentialIdGenerator());
    const handle = await auth.startDeviceFlow();

    expect(handle.expiresInSec).toBe(300);
    expect((await auth.pollDeviceToken(handle.deviceCode)).status).toBe(
      "authorization_pending",
    );
    expect((await auth.pollDeviceToken(handle.deviceCode)).status).toBe("slow_down");

    const token = auth.approveDevice(handle.deviceCode, "dev1");
    const approved = await auth.pollDeviceToken(handle.deviceCode);
    expect(approved).toEqual({ status: "approved", accessToken: token, tokenType: "Bearer" });

    expect(await auth.validateToken(token)).toEqual({ userId: "dev1" });
    expect(await auth.validateToken("bogus")).toBeNull();
  });

  it("returns expired_token after the device code lifetime", async () => {
    const clock = new ManualClock(0);
    const auth = new MockAuthProvider(clock, new SequentialIdGenerator());
    const handle = await auth.startDeviceFlow();

    clock.advanceSeconds(300);
    expect((await auth.pollDeviceToken(handle.deviceCode)).status).toBe("expired_token");
  });
});

describe("MemoryUserRepository", () => {
  it("upserts a stable user from an external identity", async () => {
    const repo = new MemoryUserRepository(new SequentialIdGenerator());
    const first = await repo.upsertFromIdentity({
      provider: "google",
      providerAccountId: "acct-1",
      email: "dev@example.com",
    });
    const second = await repo.upsertFromIdentity({
      provider: "google",
      providerAccountId: "acct-1",
      email: "dev@example.com",
    });

    expect(second.id).toBe(first.id);
    expect(first.balanceCents).toBe(0);
    expect(first.role).toBe("developer");
  });
});
