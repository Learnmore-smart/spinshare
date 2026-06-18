import { describe, expect, it } from "vitest";

import { mergeDeveloperActivityRows } from "./developer-activity-context";
import type { ActivityFeedRow } from "../activity-feed";

function row(activityId: string, createdAtMs: number): ActivityFeedRow {
  return {
    activityId,
    campaignId: `cmp_${activityId}`,
    status: "credited",
    statusLabel: "Credited",
    counted: true,
    viewDurationMs: 3000,
    durationLabel: "3.0s",
    developerCreditCents: 2,
    developerCreditUsd: "0.02",
    creditLabel: "$0.02",
    createdAtMs,
  };
}

describe("mergeDeveloperActivityRows", () => {
  it("appends a new activity page, de-duplicates ids, and keeps newest-first order", () => {
    const merged = mergeDeveloperActivityRows(
      [row("existing-newer", 3000), row("duplicate", 2000)],
      [
        {
          activityId: "older",
          campaignId: "cmp_older",
          type: "impression_attempt",
          status: "tooShort",
          viewDurationMs: 900,
          developerCreditCents: 0,
          developerCreditUsd: "0.00",
          createdAtMs: 1000,
        },
        {
          activityId: "duplicate",
          campaignId: "cmp_duplicate",
          type: "impression_attempt",
          status: "credited",
          viewDurationMs: 3000,
          developerCreditCents: 2,
          developerCreditUsd: "0.02",
          createdAtMs: 2000,
        },
      ],
    );

    expect(merged.map((activity) => activity.activityId)).toEqual([
      "existing-newer",
      "duplicate",
      "older",
    ]);
  });
});
