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
  budgetCents: 2500,
  remainingBudgetUsd: "25.00",
  status: "active",
  createdAtMs: 0,
};

describe("CampaignList", () => {
  it("presents dashboard funding as buying impression blocks", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(CampaignList, {
        token: "tok_123",
        campaigns: [campaign],
      }),
    );

    expect(html).toContain("Buy blocks");
    expect(html).toContain("1 block = 1,000 impressions");
    expect(html).not.toContain("Add funds (USD)");
  });
});
