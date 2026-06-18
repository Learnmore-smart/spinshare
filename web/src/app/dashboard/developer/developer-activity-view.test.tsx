import { describe, expect, it } from "vitest";

import {
  developerActivityRowsToCsv,
  filterDeveloperActivityRows,
} from "./developer-activity-view";

describe("DeveloperActivityView helpers", () => {
  it("filters visible activity rows by search query", () => {
    const rows = [
      {
        activityId: "activity_paid",
        campaignId: "cmp_paid",
        status: "credited",
        statusLabel: "Credited",
        counted: true,
        durationLabel: "3.2s",
        creditLabel: "$0.02",
        createdAtMs: 2000,
      },
      {
        activityId: "activity_short",
        campaignId: "cmp_no_charge",
        status: "tooShort",
        statusLabel: "Too short",
        counted: false,
        durationLabel: "0.8s",
        creditLabel: "$0.00",
        createdAtMs: 1000,
      },
    ] as const;

    expect(filterDeveloperActivityRows(rows, "no charge")).toEqual([rows[1]]);
    expect(filterDeveloperActivityRows(rows, "credited")).toEqual([rows[0]]);
  });

  it("exports visible developer activity rows as csv", () => {
    const csv = developerActivityRowsToCsv([
      {
        activityId: "activity_1",
        campaignId: "cmp_1",
        status: "credited",
        statusLabel: "Credited",
        counted: true,
        durationLabel: "3.1s",
        creditLabel: "$0.02",
        createdAtMs: 1000,
      },
    ]);

    expect(csv).toContain("activityId,campaignId,status,duration,credit,createdAtMs");
    expect(csv).toContain("activity_1,cmp_1,Credited,3.1s,$0.02,1000");
  });
});
