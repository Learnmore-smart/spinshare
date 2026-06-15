// Feature: spinshare-ad-exchange, Property 25: Developer dashboard reflects the ledger
//
// Property test for the developer dashboard's presentation logic
// (`summarizeLedger`, design "Developer Dashboard"). The dashboard view is a
// thin, pure render of the `DeveloperDashboardSummary` produced by
// `summarizeLedger`, so exercising the pure aggregation from arbitrary ledger
// fixtures fully validates what the UI shows — no DOM, server, or database
// required.
//
// The property asserts the summary always *reflects the ledger*:
//   - The total-earnings KPI equals the independently-summed developer credits
//     (Requirement 8.1: KPI cards summarize the developer total earnings), and
//     its USD string matches `formatCentsAsUsd` of that same sum.
//   - The activity table has exactly one row per ledger entry, in order, and
//     each row carries its entry's own `developerCreditCents` /
//     `developerCreditUsd` (Requirement 8.3: an activity ledger table listing
//     the developer recorded impressions and credited amounts).

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { formatCentsAsUsd, type LedgerEntry } from "@spinshare/core";

import { summarizeLedger } from "./summarize-ledger";

const RUNS = { numRuns: 100 } as const;

const DEV_ID = "dev-1";

/**
 * Build an arbitrary developer `LedgerEntry`. Mirrors the real money model:
 * `developerCreditCents` is a non-negative integer (60% of revenue rounded to
 * the nearest cent), `revenueMicrocents` equals the CPM in cents
 * (100–100000 ⇒ $1.00–$1000.00), and retention is the conserved remainder. The
 * exact split values do not matter for this property — only that the credit
 * each entry carries is faithfully surfaced — so credit is generated
 * independently across a representative range (including 0).
 */
type LedgerEntryDraft = Pick<
  LedgerEntry,
  "campaignId" | "developerCreditCents" | "revenueMicrocents"
>;

const ledgerEntryArb: fc.Arbitrary<LedgerEntryDraft> = fc.record({
  campaignId: fc.string({ minLength: 1, maxLength: 12 }),
  developerCreditCents: fc.integer({ min: 0, max: 100_000 }),
  revenueMicrocents: fc.integer({ min: 1, max: 100_000 }),
});

/**
 * Arbitrary list of ledger entries with **unique** `entryId`s (the table uses
 * `entryId` as a React key / idempotency id, so duplicates never occur in the
 * durable ledger). Length 0 is included to cover the empty-state path.
 */
const ledgerEntriesArb: fc.Arbitrary<LedgerEntry[]> = fc
  .array(ledgerEntryArb, { minLength: 0, maxLength: 40 })
  .map((partials) =>
    partials.map((p, i) => ({
      entryId: `entry-${i}`,
      developerId: DEV_ID,
      campaignId: p.campaignId,
      revenueMicrocents: p.revenueMicrocents,
      developerCreditCents: p.developerCreditCents,
      spinshareRetentionMicrocents:
        p.revenueMicrocents - p.developerCreditCents * 1000,
    })),
  );

describe("Property 25: Developer dashboard reflects the ledger", () => {
  it("total earnings KPI equals the summed developer credits (Req 8.1)", () => {
    fc.assert(
      fc.property(ledgerEntriesArb, (entries) => {
        const summary = summarizeLedger(entries);

        // Independently sum the credits the ledger carries.
        const expectedTotal = entries.reduce(
          (acc, e) => acc + e.developerCreditCents,
          0,
        );

        expect(summary.totalEarningsCents).toBe(expectedTotal);
        expect(summary.totalEarningsUsd).toBe(formatCentsAsUsd(expectedTotal));
        expect(summary.impressionCount).toBe(entries.length);
      }),
      RUNS,
    );
  });

  it("activity table has one faithful row per ledger entry, in order (Req 8.3)", () => {
    fc.assert(
      fc.property(ledgerEntriesArb, (entries) => {
        const summary = summarizeLedger(entries);

        // One row per impression (Requirement 8.3).
        expect(summary.rows).toHaveLength(entries.length);

        entries.forEach((entry, index) => {
          const row = summary.rows[index];
          expect(row).toBeDefined();
          if (!row) return; // narrows under noUncheckedIndexedAccess
          // Each row carries its own entry's credited amount, unmodified.
          expect(row.entryId).toBe(entry.entryId);
          expect(row.campaignId).toBe(entry.campaignId);
          expect(row.developerCreditCents).toBe(entry.developerCreditCents);
          expect(row.developerCreditUsd).toBe(
            formatCentsAsUsd(entry.developerCreditCents),
          );
          expect(row.sequence).toBe(index + 1);
        });
      }),
      RUNS,
    );
  });

  it("the rendered credits sum back to the KPI total (cross-check, Req 8.1 & 8.3)", () => {
    fc.assert(
      fc.property(ledgerEntriesArb, (entries) => {
        const summary = summarizeLedger(entries);

        // The amounts the table renders must reconcile to the headline KPI:
        // no impression is dropped and no credit is invented.
        const rowsTotal = summary.rows.reduce(
          (acc, r) => acc + r.developerCreditCents,
          0,
        );
        expect(rowsTotal).toBe(summary.totalEarningsCents);
      }),
      RUNS,
    );
  });
});
