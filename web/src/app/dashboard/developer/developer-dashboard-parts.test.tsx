import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ActivityList,
  ActivityTable,
  LimitMeter,
  moneyMicrocents3,
} from "./developer-dashboard-parts";

describe("moneyMicrocents3 (hero payout-threshold copy)", () => {
  it("renders display micro-cents with exactly 3 decimals", () => {
    // $5.000 minimum minus a $0.075 balance (7_500 micro-cents) => $4.925 left.
    expect(moneyMicrocents3(500_000)).toBe("$5.000");
    expect(moneyMicrocents3(500_000 - 7_500)).toBe("$4.925");
    expect(moneyMicrocents3(0)).toBe("$0.000");
  });
});

describe("developer dashboard activity table", () => {
  it("renders attempt-level status and duration", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(ActivityTable, {
        rows: [
          {
            activityId: "activity_1",
            campaignId: "cmp_1",
            status: "tooShort",
            statusLabel: "Too short",
            counted: false,
            viewDurationMs: 900,
            durationLabel: "0.9s",
            developerCreditCents: 0,
            developerCreditUsd: "0.00",
            creditLabel: "$0.00",
            createdAtMs: 1000,
          },
        ],
      }),
    );

    expect(html).toContain("cmp_1");
    expect(html).toContain("Too short");
    expect(html).toContain("0.9s");
    expect(html).toContain("$0.00");
  });

  it("keeps raw ledger details out of developer-facing rows", () => {
    Object.assign(globalThis, { React });

    const row = {
      activityId: "activity_1",
      campaignId: "cmp_1",
      status: "credited",
      statusLabel: "Credited",
      counted: true,
      viewDurationMs: 3100,
      durationLabel: "3.1s",
      developerCreditCents: 2,
      developerCreditUsd: "0.02",
      creditLabel: "$0.02",
      createdAtMs: 1_700_000_000_000,
    } as const;

    const listHtml = renderToStaticMarkup(
      React.createElement(ActivityList, { rows: [row] }),
    );
    const tableHtml = renderToStaticMarkup(
      React.createElement(ActivityTable, { rows: [row] }),
    );

    expect(listHtml).not.toContain("Details");
    expect(listHtml).not.toContain("Activity ID");
    expect(listHtml).not.toContain("activity_1");
    expect(tableHtml).not.toContain("Details");
    expect(tableHtml).not.toContain("Created");
    expect(tableHtml).not.toContain("2023-11-14T22:13:20.000Z");
  });

  it("renders cap meters with a display label when provided", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(LimitMeter, {
        label: "Hourly",
        usedCents: 0,
        usedLabel: "$0.012",
        limitCents: 2000,
        reset: "40m",
      }),
    );

    expect(html).toContain("$0.012 / $20.00");
  });
});
