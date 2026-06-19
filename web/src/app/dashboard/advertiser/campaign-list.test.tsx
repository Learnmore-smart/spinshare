import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CampaignList } from "./campaign-list";
import type { CampaignView } from "./lib";

const campaign: CampaignView = {
  id: "cmp_1",
  advertiserId: "adv_1",
  adText: "Try SpinShare for Claude Code",
  cpmCents: 500,
  cpmUsd: "5.00",
  budgetCents: 1900,
  remainingBudgetUsd: "19.00",
  status: "active",
  createdAtMs: 0,
  telemetry: {
    shows: 1500,
    clicks: 30,
    credited: 1200,
    tooShort: 100,
    invalidToken: 0,
    invalidCampaign: 0,
    shadowBanned: 0,
    earningCapped: 0,
    duplicate: 200,
  },
};

describe("CampaignList", () => {
  it("presents existing campaigns as delivery rows with buy-more-impressions controls", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(CampaignList, {
        token: "tok_123",
        campaigns: [campaign],
      }),
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="1200"');
    expect(html).toContain('aria-valuemax="5000"');
    expect(html).toContain("1,200/5,000");
    expect(html).toContain("Buy more impressions");
    expect(html).toContain("1 block = 1,000 impressions");
    expect(html).not.toContain("Cancel");
    expect(html).not.toContain("Buy blocks");
    expect(html).not.toContain("Add funds (USD)");
  });

  it("shows a cancel action for unpaid campaigns", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(CampaignList, {
        token: "tok_123",
        campaigns: [
          {
            ...campaign,
            id: "cmp_unpaid",
            budgetCents: 0,
            remainingBudgetUsd: "0.00",
            telemetry: {
              shows: 0,
              clicks: 0,
              credited: 0,
              tooShort: 0,
              invalidToken: 0,
              invalidCampaign: 0,
              shadowBanned: 0,
              earningCapped: 0,
              duplicate: 0,
            },
          },
        ],
      }),
    );

    expect(html).toContain("Cancel");
    expect(html).toContain("adv-camp-delete-btn");
  });
});
