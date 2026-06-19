/**
 * Tests for the payout risk gate (anti-fraud Tier 3c).
 *
 * The assessor reuses the collusion scan: a developer inside an account-farm
 * cluster (≥3 accounts sharing one high-fan-out IP) is blocked; an unrelated
 * developer is cleared; and any internal error fails open (never blocks).
 */

import { describe, expect, it } from "vitest";

import { MemoryActivityRepository } from "./adapters/memory";
import type { ImpressionActivity } from "./ports";
import {
  COLLUSION_CLUSTER_REASON,
  buildPayoutRiskAssessor,
} from "./payout-risk-service";

const NOW = 1_700_000_000_000;

function impression(
  developerId: string,
  ipHash: string,
  i: number,
): ImpressionActivity {
  return {
    activityId: `imp_${developerId}_${i}`,
    campaignId: "camp_1",
    type: "impression_attempt",
    status: "credited",
    viewDurationMs: 3_000,
    createdAtMs: NOW - 1_000,
    developerId,
    ipHash,
  };
}

async function seedFarm(
  activities: MemoryActivityRepository,
): Promise<void> {
  // 3 distinct earning accounts sharing one IP → fan-out farm.
  for (const dev of ["farm_a", "farm_b", "farm_c"]) {
    await activities.record(impression(dev, "ip_shared", 0));
  }
  // A clean, unrelated developer on their own IP.
  await activities.record(impression("clean_dev", "ip_solo", 0));
}

describe("buildPayoutRiskAssessor", () => {
  it("blocks a developer inside a flagged collusion cluster", async () => {
    const activities = new MemoryActivityRepository();
    await seedFarm(activities);
    const assess = buildPayoutRiskAssessor({ activities, nowMs: () => NOW });

    expect(await assess("farm_a")).toEqual({
      block: true,
      reason: COLLUSION_CLUSTER_REASON,
    });
  });

  it("clears an unrelated developer", async () => {
    const activities = new MemoryActivityRepository();
    await seedFarm(activities);
    const assess = buildPayoutRiskAssessor({ activities, nowMs: () => NOW });

    expect(await assess("clean_dev")).toEqual({ block: false });
  });

  it("fails open when the activity store throws", async () => {
    const assess = buildPayoutRiskAssessor({
      activities: {
        listRecentImpressions: async () => {
          throw new Error("store down");
        },
      } as unknown as MemoryActivityRepository,
      nowMs: () => NOW,
    });

    expect(await assess("farm_a")).toEqual({ block: false });
  });
});
