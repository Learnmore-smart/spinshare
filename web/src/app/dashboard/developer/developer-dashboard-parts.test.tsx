import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActivityTable } from "./developer-dashboard-parts";

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
});
