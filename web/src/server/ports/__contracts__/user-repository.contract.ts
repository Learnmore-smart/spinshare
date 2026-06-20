/**
 * Shared {@link UserRepository} CONTRACT (adapter-parity foundation).
 *
 * The same behavioural spec, run against every adapter (memory locally + in CI;
 * Firestore against the emulator when present). This is the structural defence
 * against the "green in the in-memory adapter, wrong in production Firestore"
 * class of bug — the highest-risk failure mode of a ports/adapters codebase,
 * because the fast test suite only ever exercises the memory adapter.
 *
 * It deliberately encodes the money-critical invariants the anti-fraud
 * earnings-hold (Tier 3a/3b/3d) depends on: held vs. available accounting,
 * lot maturation/clawback arithmetic, the available-aware payout debit, and
 * payout-fingerprint dedupe. If an adapter ever diverges on any of these, the
 * money is wrong — so the contract must pass identically everywhere.
 *
 * Bindings: each adapter has a thin `*.contract.test.ts` that calls
 * {@link runUserRepositoryContract} with a factory. Identity-enrichment shape
 * (email/provider defaults on upsert) intentionally differs between adapters
 * and is NOT asserted here — only behaviour that must be identical.
 */

import { describe, expect, it } from "vitest";
import { heldLotBucketMs } from "@spinshare/core";

import type { UserRepository } from "../user-repository";

/** Per-adapter wiring for the contract. */
export interface UserRepositoryContractHarness {
  /**
   * Returns a repository with isolated state. The memory adapter returns a
   * fresh empty instance; the Firestore adapter returns one over the (shared)
   * emulator collection — isolation there comes from {@link uid}.
   */
  makeRepo: () => UserRepository | Promise<UserRepository>;
  /**
   * A process-unique user id for `label`. Firestore shares one collection
   * across tests, so ids must never collide between cases.
   */
  uid: (label: string) => string;
}

/** A maturation time aligned to a lot bucket, so arithmetic is exact. */
const HOUR_MS = 3_600_000;
const T_MATURE = 100 * HOUR_MS; // arbitrary bucket-aligned instant

export function runUserRepositoryContract(
  name: string,
  harness: UserRepositoryContractHarness,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skip : describe;

  suite(`UserRepository contract — ${name}`, () => {
    it("getById returns null for an unknown user", async () => {
      const repo = await harness.makeRepo();
      expect(await repo.getById(harness.uid("missing"))).toBeNull();
    });

    it("applyBalanceDeltaCents upserts a missing user, then increments", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("delta");

      await repo.applyBalanceDeltaCents(id, 500);
      expect((await repo.getById(id))?.balanceCents).toBe(500);

      await repo.applyBalanceDeltaCents(id, 250);
      expect((await repo.getById(id))?.balanceCents).toBe(750);
    });

    it("creditHeldEarnings raises total + held, available stays withheld", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("held");

      await repo.creditHeldEarnings(id, 1_000, T_MATURE);
      const user = await repo.getById(id);
      expect(user?.balanceCents).toBe(1_000);
      expect(user?.heldCents).toBe(1_000);
      // Available (balance − held) is 0 → not debitable.
      expect(await repo.tryDebitBalanceCents(id, 1)).toBe(false);
      expect((await repo.getById(id))?.balanceCents).toBe(1_000);
    });

    it("creditHeldEarnings coalesces same-bucket credits into one lot", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("coalesce");

      await repo.creditHeldEarnings(id, 100, T_MATURE - 5);
      await repo.creditHeldEarnings(id, 250, T_MATURE - 1);

      const user = await repo.getById(id);
      expect(user?.heldCents).toBe(350);
      expect(user?.heldLots).toHaveLength(1);
      expect(user?.heldLots?.[0]?.cents).toBe(350);
      expect(user?.heldLots?.[0]?.maturesAtMs).toBe(heldLotBucketMs(T_MATURE));
    });

    it("matureHeldEarnings moves due lots to available without changing the total", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("mature");
      await repo.creditHeldEarnings(id, 1_000, T_MATURE);
      const bucket = heldLotBucketMs(T_MATURE);

      // Before maturity: nothing matures, still not debitable.
      expect(await repo.matureHeldEarnings(id, bucket - 1)).toBe(0);
      expect(await repo.tryDebitBalanceCents(id, 1)).toBe(false);

      // At maturity: the whole lot moves held → available.
      expect(await repo.matureHeldEarnings(id, bucket)).toBe(1_000);
      const user = await repo.getById(id);
      expect(user?.balanceCents).toBe(1_000);
      expect(user?.heldCents).toBe(0);
      expect(await repo.tryDebitBalanceCents(id, 1_000)).toBe(true);
    });

    it("voidHeldEarnings claws back only un-matured lots; matured survive", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("void");
      const due = heldLotBucketMs(T_MATURE);
      const future = heldLotBucketMs(T_MATURE + HOUR_MS);
      await repo.creditHeldEarnings(id, 400, due); // will mature
      await repo.creditHeldEarnings(id, 600, future); // still held

      await repo.matureHeldEarnings(id, due);
      const voided = await repo.voidHeldEarnings(id, due);

      expect(voided).toBe(600); // only the un-matured lot
      const user = await repo.getById(id);
      expect(user?.balanceCents).toBe(400); // matured 400 survives
      expect(user?.heldCents).toBe(0);
      expect(await repo.tryDebitBalanceCents(id, 400)).toBe(true);
    });

    it("tryDebitBalanceCents reserves against available, not total", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("debit");
      await repo.applyBalanceDeltaCents(id, 1_000); // available
      await repo.creditHeldEarnings(id, 500, T_MATURE); // held → total 1500

      // Only 1000 is available.
      expect(await repo.tryDebitBalanceCents(id, 1_500)).toBe(false);
      expect(await repo.tryDebitBalanceCents(id, 1_000)).toBe(true);
      const user = await repo.getById(id);
      expect(user?.balanceCents).toBe(500); // 1500 − 1000 debited
      expect(user?.heldCents).toBe(500); // held untouched
    });

    it("tryDebitBalanceCents returns false for an unknown user", async () => {
      const repo = await harness.makeRepo();
      expect(await repo.tryDebitBalanceCents(harness.uid("ghost"), 1)).toBe(
        false,
      );
    });

    it("setConnectAccount upserts account + eligibility, preserving balance", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("connect");
      await repo.applyBalanceDeltaCents(id, 700);

      const updated = await repo.setConnectAccount(id, {
        stripeConnectAccountId: "acct_x",
        payoutsEnabled: true,
      });
      expect(updated.stripeConnectAccountId).toBe("acct_x");
      expect(updated.payoutsEnabled).toBe(true);
      expect(updated.balanceCents).toBe(700);
    });

    it("setConnectAccount records the payout fingerprint when provided", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("fp");
      await repo.setConnectAccount(id, {
        stripeConnectAccountId: "acct_y",
        payoutsEnabled: true,
        payoutFingerprint: "fp_shared",
      });
      expect((await repo.getById(id))?.payoutFingerprint).toBe("fp_shared");
    });

    it("countAccountsByPayoutFingerprint counts distinct sharers", async () => {
      const repo = await harness.makeRepo();
      const fp = `fp_${harness.uid("share")}`;
      const a = harness.uid("a");
      const b = harness.uid("b");
      const c = harness.uid("c");

      expect(await repo.countAccountsByPayoutFingerprint(fp)).toBe(0);

      await repo.setConnectAccount(a, {
        stripeConnectAccountId: "acct_a",
        payoutsEnabled: true,
        payoutFingerprint: fp,
      });
      await repo.setConnectAccount(b, {
        stripeConnectAccountId: "acct_b",
        payoutsEnabled: true,
        payoutFingerprint: fp,
      });
      // A third account on a DIFFERENT fingerprint must not be counted.
      await repo.setConnectAccount(c, {
        stripeConnectAccountId: "acct_c",
        payoutsEnabled: true,
        payoutFingerprint: `${fp}_other`,
      });

      expect(await repo.countAccountsByPayoutFingerprint(fp)).toBe(2);
    });
  });
}
