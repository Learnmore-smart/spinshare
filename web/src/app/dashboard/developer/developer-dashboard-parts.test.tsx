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
  it("uses 2 decimals by default and 3 only when sub-cent precision matters", () => {
    expect(moneyMicrocents3(500_000)).toBe("$5.00");
    expect(moneyMicrocents3(0)).toBe("$0.00");
    // $5.00 minimum minus a $0.075 balance (7_500 micro-cents) => $4.925 left.
    expect(moneyMicrocents3(500_000 - 7_500)).toBe("$4.925");
    expect(moneyMicrocents3(479_500)).toBe("$4.795");
  });
});

describe("developer dashboard activity table", () => {
  it("renders traceable activity ids with attempt status and duration", () => {
    Object.assign(globalThis, { React });

    const row = {
      activityId: "activity_trace_1",
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
    } as const;

    const listHtml = renderToStaticMarkup(
      React.createElement(ActivityList, { rows: [row] }),
    );
    const tableHtml = renderToStaticMarkup(
      React.createElement(ActivityTable, {
        rows: [row],
      }),
    );

    expect(listHtml).toContain("activity_trace_1");
    expect(listHtml).toContain("cmp_1");
    expect(listHtml).toContain("Too short - 0.9s");
    expect(tableHtml).toContain("Activity ID");
    expect(tableHtml).toContain("activity_trace_1");
    expect(tableHtml).toContain("cmp_1");
    expect(tableHtml).toContain("Too short - 0.9s");
    expect(tableHtml).toContain("$0.00");
  });

  it("keeps verbose ledger details out while retaining the traceable id", () => {
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
    expect(listHtml).toContain("activity_1");
    expect(tableHtml).not.toContain("Details");
    expect(tableHtml).toContain("activity_1");
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
