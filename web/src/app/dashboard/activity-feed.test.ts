import { describe, expect, it } from "vitest";

import {
  activityStatusLabel,
  formatActivityDuration,
  toActivityFeedRows,
  type ActivityFeedSource,
} from "./activity-feed";

const credited: ActivityFeedSource = {
  activityId: "activity_1",
  campaignId: "cmp_1",
  status: "credited",
  viewDurationMs: 3250,
  developerCreditCents: 2,
  developerCreditUsd: "0.02",
  createdAtMs: 1000,
};

describe("activity feed helpers", () => {
  it("formats credited rows with status, duration, and USD credit", () => {
    const rows = toActivityFeedRows([credited]);

    expect(rows).toEqual([
      expect.objectContaining({
        activityId: "activity_1",
        statusLabel: "Credited",
        durationLabel: "3.3s",
        creditLabel: "$0.02",
      }),
    ]);
  });

  it("formats too-short rows as zero-credit uncounted activity", () => {
    const rows = toActivityFeedRows([
      {
        ...credited,
        activityId: "activity_2",
        status: "tooShort",
        viewDurationMs: 900,
        developerCreditCents: 0,
        developerCreditUsd: "0.00",
      },
    ]);

    expect(rows[0]).toMatchObject({
      statusLabel: "Too short",
      durationLabel: "0.9s",
      creditLabel: "$0.00",
      counted: false,
    });
  });

  it("sorts newest activity first", () => {
    const rows = toActivityFeedRows([
      { ...credited, activityId: "old", createdAtMs: 1000 },
      { ...credited, activityId: "new", createdAtMs: 3000 },
    ]);

    expect(rows.map((row) => row.activityId)).toEqual(["new", "old"]);
  });

  it("formats advertiser money events with event labels and amount labels", () => {
    const rows = toActivityFeedRows([
      {
        activityId: "payment_evt_1",
        campaignId: "cmp_1",
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 7500,
        amountUsd: "75.00",
        createdAtMs: 4000,
      },
    ]);

    expect(rows[0]).toMatchObject({
      activityId: "payment_evt_1",
      type: "advertiser_event",
      statusLabel: "Budget funded",
      durationLabel: "Funding confirmed",
      creditLabel: "$75.00",
      counted: true,
    });
  });

  it("keeps status and duration formatting stable", () => {
    expect(activityStatusLabel("invalidCampaign")).toBe("Invalid campaign");
    expect(activityStatusLabel("earningCapped")).toBe("Earning cap");
    expect(formatActivityDuration(12_345)).toBe("12.3s");
  });
});
