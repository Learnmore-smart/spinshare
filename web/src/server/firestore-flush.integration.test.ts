// Feature: spinshare-ad-exchange
//
// Task 8.4 — Integration test for the Redis→Firestore flush against the real
// Firestore client driven by the **emulator** (design "Redis→Firestore
// Reconciliation", Requirements 3.2, 3.3, 3.5).
//
// Unlike `flush-service.property.test.ts` (which reconciles into the in-memory
// repos), this test drives `runFlushCycle` with the *Firestore* adapters
// (`FirestoreLedgerRepo` / `FirestoreUserRepo` / `FirestoreCampaignRepo`) so we
// prove that durable ledger entries (one per impression, keyed by `entryId`)
// and the aggregated balance/budget deltas actually land in Firestore. The
// `MemoryCounterStore` still plays the Redis hot path (the e2e default avoids an
// external Redis dependency).
//
// ── Running this test ───────────────────────────────────────────────────────
// This test REQUIRES the Firestore emulator. It is gated on
// `FIRESTORE_EMULATOR_HOST` and SKIPS cleanly when the emulator is not
// configured or is unreachable, so it never breaks
// `pnpm --filter @spinshare/web test` in environments without the emulator.
//
//   1. Start the emulator (from the repo root):
//        corepack pnpm@9.12.0 emulators
//      (runs `firebase emulators:start --only firestore`)
//   2. Point the test at it and run the suite, e.g.:
//        $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"   # PowerShell
//        FIRESTORE_EMULATOR_HOST=127.0.0.1:8080            # bash
//        corepack pnpm@9.12.0 --filter @spinshare/web test
//
// When `FIRESTORE_EMULATOR_HOST` is unset (CI / this environment), the whole
// describe block is skipped.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MICROCENTS_PER_CENT, computeSplit } from "@spinshare/core";

import {
  FirestoreCampaignRepo,
  FirestoreLedgerRepo,
  FirestoreUserRepo,
  getFirestoreClient,
  COLLECTIONS,
} from "./adapters/firestore";
import {
  ManualClock,
  MemoryCounterStore,
  SequentialIdGenerator,
} from "./adapters/memory";
import { runFlushCycle, type FlushServiceDeps } from "./flush-service";

/** The emulator is only usable when this is set (Admin SDK routes to it). */
const EMULATOR_CONFIGURED = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** Convert micro-cents to whole cents, half-away-from-zero (matches flush). */
function microcentsToCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

// Skip the entire suite cleanly when the emulator is not configured.
describe.skipIf(!EMULATOR_CONFIGURED)(
  "Firestore emulator flush integration (Requirements 3.2, 3.3, 3.5)",
  () => {
    // Unique per-run namespace so repeated/parallel runs never collide and we
    // can clean up only what this run created.
    const runId = `it_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    // Seeded fixtures (durable, written directly to the emulator).
    const userId = `${runId}_usr_0`;
    const startBalanceCents = 1_000;
    const campaignId = `${runId}_cmp_0`;
    const startBudgetCents = 1_000_000;
    const cpmCents = 30_000; // $300.00 CPM → 30000 microcents revenue / impression
    const impressionCount = 5;
    const entryIds = Array.from(
      { length: impressionCount },
      (_, i) => `${runId}_entry_${i}`,
    );

    /**
     * Whether the emulator is actually reachable. Determined by a short probe
     * in `beforeAll`; if the host is set but unreachable we skip the test body
     * (rather than hang or hard-fail).
     */
    let reachable = false;

    beforeAll(async () => {
      const db = getFirestoreClient();
      try {
        // A lightweight reachability probe with a hard timeout so an unset /
        // dead emulator does not stall the suite.
        await Promise.race([
          db.collection(COLLECTIONS.users).doc(`${runId}_probe`).set({ ok: true }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("emulator probe timed out")), 5_000),
          ),
        ]);
        await db.collection(COLLECTIONS.users).doc(`${runId}_probe`).delete();
        reachable = true;
      } catch {
        reachable = false;
        return;
      }

      // Seed a developer with a known starting balance and an advertiser
      // campaign with a known starting budget + CPM, written straight to the
      // emulator so the flush has durable rows to mutate.
      await db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .set({
          id: userId,
          email: `${userId}@example.test`,
          provider: "google",
          role: "developer",
          balanceCents: startBalanceCents,
        });
      await db
        .collection(COLLECTIONS.campaigns)
        .doc(campaignId)
        .set({
          id: campaignId,
          advertiserId: `${runId}_adv_0`,
          adText: "Ship faster with Acme CI",
          cpmCents,
          budgetCents: startBudgetCents,
          status: "active",
          createdAtMs: 0,
        });
    }, 30_000);

    afterAll(async () => {
      if (!reachable) return;
      // Best-effort cleanup of everything this run created.
      const db = getFirestoreClient();
      const deletions: Promise<unknown>[] = [
        db.collection(COLLECTIONS.users).doc(userId).delete(),
        db.collection(COLLECTIONS.campaigns).doc(campaignId).delete(),
        ...entryIds.map((id) =>
          db.collection(COLLECTIONS.ledgerEntries).doc(id).delete(),
        ),
      ];
      await Promise.allSettled(deletions);
    });

    it("drains pending entries → durable ledger entries + aggregated deltas land in the emulator", async (ctx) => {
      if (!reachable) {
        // Host set but emulator unreachable → skip cleanly instead of failing.
        ctx.skip();
        return;
      }

      const db = getFirestoreClient();

      // Hot path: MemoryCounterStore enqueues one durable LedgerEntry per
      // impression. Durable repos point at the emulator.
      const counters = new MemoryCounterStore(
        new ManualClock(0),
        new SequentialIdGenerator(),
      );
      const deps: FlushServiceDeps = {
        counters,
        ledger: new FirestoreLedgerRepo({ db }),
        users: new FirestoreUserRepo({ db }),
        campaigns: new FirestoreCampaignRepo({ db }),
      };

      const split = computeSplit(cpmCents);

      // Apply N impressions for the seeded developer/campaign.
      for (let i = 0; i < impressionCount; i++) {
        const result = await counters.applyImpression({
          developerId: userId,
          campaignId,
          entryId: entryIds[i]!,
          split,
          occurredAtMs: 0,
        });
        expect(result.applied).toBe(true);
      }

      // Reconcile. The default batch size dwarfs the impression count, so a
      // single cycle drains everything.
      const cycle = await runFlushCycle(deps);
      expect(cycle.flushed).toBe(true);
      expect(cycle.drained).toBe(impressionCount);

      // (a) Exactly one durable ledger entry per impression, keyed by entryId
      //     (Requirements 3.5).
      for (const entryId of entryIds) {
        const doc = await db
          .collection(COLLECTIONS.ledgerEntries)
          .doc(entryId)
          .get();
        expect(doc.exists).toBe(true);
        const data = doc.data();
        expect(data).toBeDefined();
        const entry = data!;
        expect(entry.entryId).toBe(entryId);
        expect(entry.campaignId).toBe(campaignId);
        expect(entry.developerId).toBe(userId);
        expect(Number(entry.revenueMicrocents)).toBe(split.revenueMicrocents);
        expect(Number(entry.developerCreditCents)).toBe(
          split.developerCreditCents,
        );
        // Per-entry split conservation: credit + retention == revenue (exact).
        expect(
          Number(entry.developerCreditCents) * MICROCENTS_PER_CENT +
            Number(entry.spinshareRetentionMicrocents),
        ).toBe(Number(entry.revenueMicrocents));
      }

      // (b) Aggregated developer balance delta landed durably (Requirement 3.3):
      //     balance increased by the sum of developer credits.
      const usersRepo = deps.users;
      const durableUser = await usersRepo.getById(userId);
      expect(durableUser).not.toBeNull();
      expect(durableUser!.balanceCents).toBe(
        startBalanceCents + split.developerCreditCents * impressionCount,
      );

      // (c) Aggregated campaign budget delta landed durably (Requirements 3.2,
      //     3.3): budget decreased by the full per-impression revenue, summed in
      //     micro-cents and converted to cents once (matching the flush).
      const campaignsRepo = deps.campaigns;
      const durableCampaign = await campaignsRepo.getById(campaignId);
      expect(durableCampaign).not.toBeNull();
      const totalRevenueMicrocents = split.revenueMicrocents * impressionCount;
      expect(durableCampaign!.budgetCents).toBe(
        startBudgetCents - microcentsToCents(totalRevenueMicrocents),
      );
    }, 30_000);
  },
);
