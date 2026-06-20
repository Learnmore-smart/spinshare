import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useDeveloperDashboard: vi.fn(),
}));

vi.mock("@/components/SegmentSlider", () => ({
  SegmentSlider: () => React.createElement("div"),
}));

vi.mock("@/components/TiltCard", () => ({
  TiltCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/lib/i18n/locale-provider", () => ({
  useLocale: () => "en",
  useT: () => ({
    developerDashboard: {
      chartRange24h: "24h",
      chartRange7d: "7d",
      chartRange30d: "30d",
      chartRangeAll: "All",
      chartTimeRangeAria: "Time range",
      earningsCurve: "Earnings curve",
      earningsCurveSub: "Cumulative credit",
      nothingCreditedYet: "Nothing credited yet",
      installToStart: "Install to start",
    },
  }),
}));

vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ resolved: "dark" }),
}));

vi.mock("./developer-dashboard-data", () => ({
  useDeveloperDashboard: mocks.useDeveloperDashboard,
}));

vi.mock("./earnings-chart", () => ({
  EarningsChart: ({
    series,
  }: {
    series: Array<{ cumulativeUsd: number }>;
  }) =>
    React.createElement("div", {
      "data-testid": "earnings-chart",
      "data-last-value": series.at(-1)?.cumulativeUsd,
    }),
}));

vi.mock("./setup-guide-modal", () => ({
  SetupGuideLinkButton: () => null,
}));

import { DeveloperEarningsView } from "./developer-earnings-view";

describe("DeveloperEarningsView", () => {
  beforeEach(() => {
    mocks.useDeveloperDashboard.mockReset();
  });

  it("renders the $1 curve for a bonus-only account with zero impressions", () => {
    Object.assign(globalThis, { React });
    mocks.useDeveloperDashboard.mockReturnValue({
      summary: {
        impressionCount: 0,
        rows: [
          {
            entryId: "signup_bonus:dev1",
            ledgerType: "signup_bonus",
            sequence: 1,
            campaignId: "",
            developerCreditCents: 100,
            developerCreditUsd: "1.00",
            developerCreditDisplayMicrocents: 100_000,
            developerCreditDisplayUsd: "1.00",
            createdAtMs: Date.now(),
          },
        ],
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(DeveloperEarningsView),
    );

    expect(html).toContain('data-testid="earnings-chart"');
    expect(html).toContain('data-last-value="1"');
    expect(html).not.toContain('data-testid="empty-state"');
  });
});
