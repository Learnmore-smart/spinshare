import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
  notFound: vi.fn(),
  flushPendingForRead: vi.fn(),
  loadPlatformStats: vi.fn(),
  getContainer: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/flush-before-read", () => ({
  flushPendingForRead: mocks.flushPendingForRead,
}));

vi.mock("@/server/platform-stats", () => ({
  loadPlatformStats: mocks.loadPlatformStats,
}));

vi.mock("@/server/container", () => ({
  getContainer: mocks.getContainer,
}));

vi.mock("./dev-shell", () => ({
  default: ({
    isLocal,
    stats,
  }: {
    isLocal: boolean;
    stats: { totalDevelopers: number };
  }) => (
    <div data-testid="dev-shell" data-local={String(isLocal)}>
      {stats.totalDevelopers}
    </div>
  ),
}));

import DevPage from "./page";

const stats = {
  updatedAtMs: 1,
  totalDevelopers: 3,
  totalAdvertisers: 1,
  developersLast7d: 1,
  developersLast30d: 2,
  connectedPayouts: 1,
  totalDeveloperEarningsCents: 100,
  totalDeveloperEarningsUsd: "$1.00",
  totalCreditedImpressions: 10,
  adHoursServed: 0.01,
  impressionsToday: 2,
  earningsTodayCents: 5,
  earningsTodayUsd: "$0.05",
  liveCampaigns: 1,
  topCpmCents: 500,
  topCpmUsd: "$5.00",
  advertiserSpendCents: 2.5,
  advertiserSpendUsd: "$0.025",
};

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.headers.mockReset();
  mocks.notFound.mockReset();
  mocks.flushPendingForRead.mockReset();
  mocks.loadPlatformStats.mockReset();
  mocks.getContainer.mockReset();
  mocks.notFound.mockImplementation(() => {
    throw new Error("NOT_FOUND");
  });
  mocks.getContainer.mockReturnValue({
    users: {},
    campaigns: {},
    ledger: {},
  });
  mocks.loadPlatformStats.mockResolvedValue(stats);
});

describe("/dev page", () => {
  it("allows localhost without auth", async () => {
    Object.assign(globalThis, { React });
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));

    const view = await DevPage();

    expect(view.props.isLocal).toBe(true);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("returns 404 on production for unauthorized users", async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: "spinshare.dev" }));
    mocks.auth.mockResolvedValue({ user: { email: "other@example.com" } });

    await expect(DevPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("renders for internal admin on production", async () => {
    Object.assign(globalThis, { React });
    mocks.headers.mockResolvedValue(new Headers({ host: "spinshare.dev" }));
    mocks.auth.mockResolvedValue({ user: { email: "noahzh52@gmail.com" } });

    const view = await DevPage();

    expect(view.props.isLocal).toBe(false);
    expect(view.props.stats.totalDevelopers).toBe(3);
    expect(mocks.flushPendingForRead).toHaveBeenCalled();
  });
});
