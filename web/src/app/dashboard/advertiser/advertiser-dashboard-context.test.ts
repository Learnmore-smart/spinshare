import { describe, expect, it } from "vitest";

import { mergeActivityRows } from "./advertiser-dashboard-context";
import {
  defaultActivityFeedCopy,
  type ActivityFeedCopy,
  type ActivityFeedRow,
} from "../activity-feed";

const localizedCopy: ActivityFeedCopy = {
  ...defaultActivityFeedCopy,
  statuses: {
    ...defaultActivityFeedCopy.statuses,
    budgetFunded: "Budget confirme",
  },
  eventLabels: {
    ...defaultActivityFeedCopy.eventLabels,
    fundingConfirmed: "Financement confirme",
  },
};

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

describe("mergeActivityRows", () => {
  it("appends a new activity page, de-duplicates ids, and keeps newest-first order", () => {
    const merged = mergeActivityRows(
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

  it("formats incoming activity pages with caller-supplied locale copy", () => {
    const merged = mergeActivityRows(
      [],
      [
        {
          activityId: "funded",
          campaignId: "cmp_funded",
          type: "advertiser_event",
          status: "budgetFunded",
          amountCents: 500,
          amountUsd: "5.00",
          createdAtMs: 1000,
        },
      ],
      localizedCopy,
    );

    expect(merged[0]).toMatchObject({
      statusLabel: "Budget confirme",
      durationLabel: "Financement confirme",
    });
  });
});
