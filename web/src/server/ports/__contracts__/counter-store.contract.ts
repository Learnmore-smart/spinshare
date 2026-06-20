/**
 * Shared {@link CounterStore} CONTRACT (adapter-parity foundation).
 *
 * The counter store IS the hot money path: it credits balances, decrements
 * budgets, enqueues the durable ledger, and gates replay/velocity/fan-out. The
 * memory adapter (a Map, tested everywhere) and the RTDB adapter (transactions
 * over a live tree, what prod runs) must behave identically or money and
 * anti-fraud counters diverge between dev and prod.
 *
 * Scope note: clock-EXPIRY behaviour (velocity/shadow-ban TTL) is deliberately
 * NOT asserted — memory uses an injected `Clock` while RTDB uses wall-clock, so
 * an expiry test could only pass for one. The contract asserts the
 * within-window / immediate behaviour that must be identical, plus the
 * money-movement, idempotency, and drain/ack/nack reconciliation semantics that
 * are the load-bearing guarantees.
 */

import { describe, expect, it } from "vitest";
import { computeSplit } from "@spinshare/core";

import type { CounterStore } from "../counter-store";

export interface CounterStoreContractHarness {
  makeStore: () => CounterStore | Promise<CounterStore>;
  uid: (label: string) => string;
}

export function runCounterStoreContract(
  name: string,
  harness: CounterStoreContractHarness,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skip : describe;

  suite(`CounterStore contract — ${name}`, () => {
    const split = computeSplit(30_000); // $300 CPM

    it("applyImpression credits balance + decrements budget, idempotent by entryId", async () => {
      const store = await harness.makeStore();
      const dev = harness.uid("dev");
      const cmp = harness.uid("cmp");
      const entryId = harness.uid("entry");

      expect(await store.getBalanceCents(dev)).toBe(0);
      expect(await store.getBudgetCents(cmp)).toBe(0);

      const first = await store.applyImpression({
        developerId: dev,
        campaignId: cmp,
        entryId,
        split,
        occurredAtMs: 1_000,
      });
      expect(first.applied).toBe(true);
      expect(await store.getBalanceCents(dev)).toBe(split.developerCreditCents);
      expect(await store.getBudgetCents(cmp)).toBeLessThan(0);

      // Replay of the same entryId must NOT move money again.
      const replay = await store.applyImpression({
        developerId: dev,
        campaignId: cmp,
        entryId,
        split,
        occurredAtMs: 1_000,
      });
      expect(replay.applied).toBe(false);
      expect(await store.getBalanceCents(dev)).toBe(split.developerCreditCents);
    });

    it("drain → ack subtracts the drained deltas from the pending counters", async () => {
      const store = await harness.makeStore();
      const dev = harness.uid("dev");
      const cmp = harness.uid("cmp");
      const entryId = harness.uid("entry");
      await store.applyImpression({
        developerId: dev,
        campaignId: cmp,
        entryId,
        split,
        occurredAtMs: 1_000,
      });

      const batch = await store.drainPending(100);
      expect(batch.entries.map((e) => e.entryId)).toContain(entryId);
      expect(batch.balanceDeltaCentsByUser[dev]).toBe(split.developerCreditCents);
      expect(batch.budgetDeltaCentsByCampaign[cmp]).toBeLessThan(0);

      await store.ackDrained(batch.batchToken);
      // After a successful flush the pending delta is cleared.
      expect(await store.getBalanceCents(dev)).toBe(0);

      // Idempotent: acking an unknown/again token is a no-op (does not throw).
      await store.ackDrained(batch.batchToken);
    });

    it("drain → nack returns the entries to the pending queue for retry", async () => {
      const store = await harness.makeStore();
      const dev = harness.uid("dev");
      const cmp = harness.uid("cmp");
      const entryId = harness.uid("entry");
      await store.applyImpression({
        developerId: dev,
        campaignId: cmp,
        entryId,
        split,
        occurredAtMs: 1_000,
      });

      const first = await store.drainPending(100);
      expect(first.entries.map((e) => e.entryId)).toContain(entryId);

      await store.nackDrained(first.batchToken);

      const second = await store.drainPending(100);
      expect(second.entries.map((e) => e.entryId)).toContain(entryId);
    });

    it("consumeOnce returns true once then false (replay protection)", async () => {
      const store = await harness.makeStore();
      const key = harness.uid("nonce");
      expect(await store.consumeOnce(key, 3_600)).toBe(true);
      expect(await store.consumeOnce(key, 3_600)).toBe(false);
    });

    it("incrementVelocity and incrementIpVelocity count within a window", async () => {
      const store = await harness.makeStore();
      // A window-start safely in the future so the counter is un-expired under
      // BOTH the memory clock and the RTDB wall-clock (avoids boundary flake).
      const win = Math.floor(Date.now() / 1000) + 3_600;
      const user = harness.uid("u");
      const ip = harness.uid("ip");
      expect(await store.incrementVelocity(user, win)).toBe(1);
      expect(await store.incrementVelocity(user, win)).toBe(2);
      expect(await store.incrementIpVelocity(ip, win)).toBe(1);
      expect(await store.incrementIpVelocity(ip, win)).toBe(2);
    });

    it("recordIpFanout counts DISTINCT developers on an IP", async () => {
      const store = await harness.makeStore();
      const win = Math.floor(Date.now() / 1000) + 3_600;
      const ip = harness.uid("ip");
      const a = harness.uid("a");
      const b = harness.uid("b");
      expect(await store.recordIpFanout(ip, a, win)).toBe(1);
      expect(await store.recordIpFanout(ip, b, win)).toBe(2);
      expect(await store.recordIpFanout(ip, a, win)).toBe(2); // a already counted
    });

    it("shadow-ban set then read reports banned", async () => {
      const store = await harness.makeStore();
      const user = harness.uid("u");
      expect(await store.isShadowBanned(user)).toBe(false);
      await store.setShadowBan(user, 3_600);
      expect(await store.isShadowBanned(user)).toBe(true);
    });

    it("earning windows accumulate and read back for the same instant", async () => {
      const store = await harness.makeStore();
      const user = harness.uid("u");
      const now = 1_700_000_000_000;
      await store.addEarnedCents(user, 100, now);
      await store.addEarnedCents(user, 50, now);
      const windows = await store.getEarnedCentsInWindows(user, now);
      expect(windows.hourlyCents).toBe(150);
      expect(windows.dailyCents).toBe(150);
    });

    it("campaign telemetry increments and reads back", async () => {
      const store = await harness.makeStore();
      const cmp = harness.uid("cmp");
      await store.incrementCampaignTelemetry(cmp, "shows");
      await store.incrementCampaignTelemetry(cmp, "shows");
      await store.incrementCampaignTelemetry(cmp, "credited");
      const telemetry = await store.getCampaignTelemetry([cmp]);
      expect(telemetry[cmp]?.shows).toBe(2);
      expect(telemetry[cmp]?.credited).toBe(1);
      expect(telemetry[cmp]?.clicks).toBe(0);
    });
  });
}
