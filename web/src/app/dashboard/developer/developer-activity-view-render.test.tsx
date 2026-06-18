import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  useDeveloperActivity: vi.fn(),
}));

vi.mock("./developer-activity-context", () => ({
  useDeveloperActivity: mocks.useDeveloperActivity,
}));

vi.mock("./setup-guide-modal", () => ({
  SetupGuideLinkButton: () => null,
}));

import { DeveloperActivityView } from "./developer-activity-view";
import type { DeveloperActivityState } from "./developer-activity-context";

function readyState(
  overrides: Partial<
    Extract<DeveloperActivityState, { status: "ready" }>
  > = {},
): Extract<DeveloperActivityState, { status: "ready" }> {
  return {
    status: "ready",
    activities: [],
    ...overrides,
  };
}

describe("DeveloperActivityView load-more", () => {
  beforeEach(() => {
    mocks.useDeveloperActivity.mockReset();
  });

  it("renders a loading state before activity arrives", () => {
    Object.assign(globalThis, { React });
    mocks.useDeveloperActivity.mockReturnValue({
      activityState: { status: "loading" },
      loadMoreActivity: undefined,
    });

    const html = renderToStaticMarkup(
      React.createElement(DeveloperActivityView),
    );

    expect(html).toContain("Loading activity...");
  });

  it("renders a load-more control when another activity page exists", () => {
    Object.assign(globalThis, { React });
    mocks.useDeveloperActivity.mockReturnValue({
      activityState: readyState({
        nextCursor: "1000:activity_1",
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
            createdAtMs: 1000,
          },
        ],
      }),
      loadMoreActivity: () => undefined,
    });

    const html = renderToStaticMarkup(
      React.createElement(DeveloperActivityView),
    );

    expect(html).toContain("Load more activity");
  });

  it("keeps existing rows visible while a later page is loading", () => {
    Object.assign(globalThis, { React });
    mocks.useDeveloperActivity.mockReturnValue({
      activityState: readyState({
        nextCursor: "1000:activity_1",
        loadingMore: true,
        loadMoreError: "Activity failed to load. Check your connection and retry.",
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
            createdAtMs: 1000,
          },
        ],
      }),
      loadMoreActivity: () => undefined,
    });

    const html = renderToStaticMarkup(
      React.createElement(DeveloperActivityView),
    );

    expect(html).toContain("cmp_1");
    expect(html).toContain("Loading more activity...");
    expect(html).toContain("Activity failed to load");
  });

  it("does not render a load-more control when there is no next cursor", () => {
    Object.assign(globalThis, { React });
    mocks.useDeveloperActivity.mockReturnValue({
      activityState: readyState({
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
            createdAtMs: 1000,
          },
        ],
      }),
      loadMoreActivity: () => undefined,
    });

    const html = renderToStaticMarkup(
      React.createElement(DeveloperActivityView),
    );

    expect(html).not.toContain("Load more activity");
  });
});
