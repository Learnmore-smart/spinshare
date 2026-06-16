import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvertiserActivityFeed } from "./advertiser-activity-feed";

describe("AdvertiserActivityFeed", () => {
  it("renders a loading state before activity arrives", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: { status: "loading" },
      }),
    );

    expect(html).toContain("Recent activity");
    expect(html).toContain("Loading activity");
  });

  it("renders credited and non-credited activity rows", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: {
          status: "ready",
          activities: [
            {
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
              createdAtMs: 2000,
            },
            {
              activityId: "activity_2",
              campaignId: "cmp_2",
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
        },
      }),
    );

    expect(html).toContain("cmp_1");
    expect(html).toContain("Credited");
    expect(html).toContain("$0.02");
    expect(html).toContain("cmp_2");
    expect(html).toContain("Too short");
    expect(html).toContain("0.9s");
  });
});
