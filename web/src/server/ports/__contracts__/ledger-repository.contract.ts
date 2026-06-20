/**
 * Shared {@link LedgerRepository} CONTRACT (adapter-parity foundation).
 *
 * The ledger is the durable system of record for money. Its load-bearing
 * guarantee is IDEMPOTENCY by `entryId` — that is what makes flush retries
 * unable to double-count. Memory enforces it with a Map; Firestore with a
 * read-then-write transaction. Both must behave identically, and the money
 * fields must round-trip through the Firestore `toLedgerEntry` mapper unchanged.
 *
 * Note on what is intentionally NOT asserted: `createdAtMs` (Firestore stamps a
 * server timestamp, so it legitimately differs from the value memory echoes
 * back) and result ORDER (entries written in one transaction share a server
 * timestamp, so their relative order is undefined). The contract asserts
 * membership + content, which is what correctness depends on.
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@spinshare/core";

import type { LedgerRepository } from "../ledger-repository";

export interface LedgerRepositoryContractHarness {
  makeRepo: () => LedgerRepository | Promise<LedgerRepository>;
  uid: (label: string) => string;
}

export function runLedgerRepositoryContract(
  name: string,
  harness: LedgerRepositoryContractHarness,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skip : describe;

  suite(`LedgerRepository contract — ${name}`, () => {
    function entry(
      overrides: Partial<LedgerEntry> & { entryId: string },
    ): LedgerEntry {
      return {
        campaignId: harness.uid("cmp"),
        developerId: harness.uid("dev"),
        revenueMicrocents: 30_000,
        developerCreditCents: 21,
        spinshareRetentionMicrocents: 9_000,
        createdAtMs: 1_000,
        ...overrides,
      };
    }

    it("getByEntryId returns null for an unknown entry", async () => {
      const repo = await harness.makeRepo();
      expect(await repo.getByEntryId(harness.uid("missing"))).toBeNull();
    });

    it("appendEntries is idempotent by entryId and round-trips money fields", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("e");
      const dev = harness.uid("dev");
      await repo.appendEntries([
        entry({
          entryId: id,
          developerId: dev,
          revenueMicrocents: 30_000,
          developerCreditCents: 21,
          spinshareRetentionMicrocents: 9_000,
          creditCents: 21,
          description: "impression",
        }),
      ]);
      // Re-append the SAME id with different money — must be ignored (first wins).
      await repo.appendEntries([
        entry({ entryId: id, developerId: dev, developerCreditCents: 999 }),
      ]);

      const got = await repo.getByEntryId(id);
      expect(got?.entryId).toBe(id);
      expect(got?.developerId).toBe(dev);
      expect(got?.revenueMicrocents).toBe(30_000);
      expect(got?.developerCreditCents).toBe(21); // not 999
      expect(got?.spinshareRetentionMicrocents).toBe(9_000);
      expect(got?.creditCents).toBe(21);
      expect(got?.description).toBe("impression");

      // Idempotent at the developer level too: exactly one entry.
      expect(await repo.listByDeveloper(dev)).toHaveLength(1);
    });

    it("appendEntryIfAbsent returns true on first write, false on a duplicate", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("once");
      expect(await repo.appendEntryIfAbsent(entry({ entryId: id }))).toBe(true);
      expect(await repo.appendEntryIfAbsent(entry({ entryId: id }))).toBe(false);
    });

    it("listByDeveloper returns exactly that developer's entries", async () => {
      const repo = await harness.makeRepo();
      const dev = harness.uid("dev");
      const other = harness.uid("other");
      const a = harness.uid("a");
      const b = harness.uid("b");
      await repo.appendEntries([
        entry({ entryId: a, developerId: dev, createdAtMs: 1 }),
        entry({ entryId: b, developerId: dev, createdAtMs: 2 }),
        entry({ entryId: harness.uid("c"), developerId: other, createdAtMs: 3 }),
      ]);

      const rows = await repo.listByDeveloper(dev);
      expect(rows.map((r) => r.entryId).sort()).toEqual([a, b].sort());
    });

    it("countByCampaignIds counts impressions per campaign, skipping bonuses", async () => {
      const repo = await harness.makeRepo();
      const cmpA = harness.uid("cmpA");
      const cmpB = harness.uid("cmpB");
      const dev = harness.uid("dev");
      await repo.appendEntries([
        entry({ entryId: harness.uid("a1"), campaignId: cmpA, developerId: dev }),
        entry({ entryId: harness.uid("a2"), campaignId: cmpA, developerId: dev }),
        entry({ entryId: harness.uid("b1"), campaignId: cmpB, developerId: dev }),
        // A signup bonus (no campaign) must not be counted.
        entry({
          entryId: harness.uid("bonus"),
          campaignId: "",
          developerId: dev,
          type: "signup_bonus",
        }),
      ]);

      const counts = await repo.countByCampaignIds([cmpA, cmpB]);
      expect(counts[cmpA]).toBe(2);
      expect(counts[cmpB]).toBe(1);
    });
  });
}
