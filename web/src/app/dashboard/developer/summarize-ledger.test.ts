/**
 * Unit tests for the pure developer-dashboard aggregation (`summarizeLedger`).
 *
 * Covers the example/edge cases behind Requirements 8.1 (total earnings) and
 * 8.3 (one activity row per impression with its credited amount). The universal
 * property (Property 25) is owned by task 12.5.
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@spinshare/core";

import { summarizeLedger, buildChartSeries } from "./summarize-ledger";

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    entryId: "e1",
    campaignId: "c1",
    developerId: "dev1",
    revenueMicrocents: 30,
    developerCreditCents: 18,
    spinshareRetentionMicrocents: 12000,
    ...overrides,
  };
}

describe("summarizeLedger", () => {
  it("returns an empty summary for no entries", () => {
    const summary = summarizeLedger([]);
    expect(summary.totalEarningsCents).toBe(0);
    expect(summary.totalEarningsUsd).toBe("0.00");
    expect(summary.todayEarningsCents).toBe(0);
    expect(summary.hourlyEarningsCents).toBe(0);
    expect(summary.monthEarningsCents).toBe(0);
    expect(summary.impressionCount).toBe(0);
    expect(summary.hasSignupBonus).toBe(false);
    expect(summary.rows).toHaveLength(0);
    expect(summary.series).toHaveLength(0);
  });

  it("totals earnings as the sum of credited amounts (Req 8.1)", () => {
    const summary = summarizeLedger([
      entry({ entryId: "a", developerCreditCents: 18 }),
      entry({ entryId: "b", developerCreditCents: 7 }),
      entry({ entryId: "c", developerCreditCents: 25 }),
    ]);
    expect(summary.totalEarningsCents).toBe(50);
    expect(summary.totalEarningsUsd).toBe("0.50");
    expect(summary.impressionCount).toBe(3);
  });

  it("aggregates sub-cent credited rows into dashboard display earnings", () => {
    const now = Date.now();
    const summary = summarizeLedger([
      entry({ entryId: "a", revenueMicrocents: 500, developerCreditCents: 0, createdAtMs: now }),
      entry({ entryId: "b", revenueMicrocents: 500, developerCreditCents: 0, createdAtMs: now }),
      entry({ entryId: "c", revenueMicrocents: 500, developerCreditCents: 0, createdAtMs: now }),
      entry({ entryId: "d", revenueMicrocents: 500, developerCreditCents: 0, createdAtMs: now }),
    ]);

    expect(summary.totalEarningsCents).toBe(0);
    expect(summary.totalEarningsUsd).toBe("0.012");
    expect(summary.todayEarningsUsd).toBe("0.012");
    expect(summary.monthEarningsUsd).toBe("0.012");
    expect(summary.hourlyEarningsUsd).toBe("0.012");
  });

  it("emits one activity row per entry with its credited amount (Req 8.3)", () => {
    const entries = [
      entry({ entryId: "a", campaignId: "camp-a", developerCreditCents: 18 }),
      entry({ entryId: "b", campaignId: "camp-b", developerCreditCents: 100 }),
    ];
    const summary = summarizeLedger(entries);

    expect(summary.rows).toHaveLength(2);
    expect(summary.rows[0]).toMatchObject({
      entryId: "a",
      sequence: 1,
      campaignId: "camp-a",
      developerCreditCents: 18,
      developerCreditUsd: "0.18",
    });
    expect(summary.rows[1]).toMatchObject({
      entryId: "b",
      sequence: 2,
      campaignId: "camp-b",
      developerCreditCents: 100,
      developerCreditUsd: "1.00",
    });
  });

  it("builds a cumulative earnings series in recording order (Req 8.2)", () => {
    const summary = summarizeLedger([
      entry({ entryId: "a", developerCreditCents: 10 }),
      entry({ entryId: "b", developerCreditCents: 15 }),
    ]);
    expect(summary.series).toEqual([
      {
        sequence: 1,
        label: "#1",
        creditCents: 10,
        creditDisplayMicrocents: 10_000,
        cumulativeCents: 10,
        cumulativeDisplayMicrocents: 10_000,
        cumulativeUsd: 0.1,
      },
      {
        sequence: 2,
        label: "#2",
        creditCents: 15,
        creditDisplayMicrocents: 15_000,
        cumulativeCents: 25,
        cumulativeDisplayMicrocents: 25_000,
        cumulativeUsd: 0.25,
      },
    ]);
  });

  it("builds chart series for all time without filtering", () => {
    const rows = summarizeLedger([
      entry({ entryId: "a", developerCreditCents: 10, createdAtMs: 0 }),
      entry({ entryId: "b", developerCreditCents: 5, createdAtMs: Date.now() }),
    ]).rows;
    const series = buildChartSeries(rows, "all");
    expect(series).toHaveLength(2);
    expect(series[1]?.cumulativeCents).toBe(15);
  });

  it("does not mutate the input array", () => {
    const entries = [entry({ entryId: "a" })];
    const snapshot = JSON.stringify(entries);
    summarizeLedger(entries);
    expect(JSON.stringify(entries)).toBe(snapshot);
  });
});
