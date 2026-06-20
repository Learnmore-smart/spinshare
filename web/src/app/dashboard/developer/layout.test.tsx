import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  mintToken: vi.fn(),
  listByDeveloper: vi.fn(),
  flushPendingForRead: vi.fn(),
  grantSignupBonus: vi.fn(),
  events: [] as string[],
}));

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/flush-before-read", () => ({
  flushPendingForRead: mocks.flushPendingForRead,
}));

// The layout grants the one-time signup bonus on load; that path has its own
// tests. Stub it here so this test stays focused on the flush→ledger-read order.
vi.mock("@/server/signup-bonus-service", () => ({
  grantSignupBonus: mocks.grantSignupBonus,
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    auth: {
      mintToken: mocks.mintToken,
    },
    ledger: {
      listByDeveloper: mocks.listByDeveloper,
    },
    users: {},
  }),
}));

vi.mock("./dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./developer-activity-context", () => ({
  DeveloperActivityProviderClient: ({
    children,
    token,
    pinnedActivities,
  }: {
    children: React.ReactNode;
    token: string;
    pinnedActivities?: readonly unknown[];
  }) => <div data-token={token} data-pinned-count={pinnedActivities?.length ?? 0}>{children}</div>,
}));

import DeveloperDashboardLayout from "./layout";

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.mintToken.mockReset();
  mocks.listByDeveloper.mockReset();
  mocks.flushPendingForRead.mockReset();
  mocks.grantSignupBonus.mockReset();
  mocks.grantSignupBonus.mockResolvedValue({
    granted: false,
    reason: "already_granted",
  });
  mocks.events.length = 0;
});

describe("DeveloperDashboardLayout", () => {
  it("flushes pending ledger work before reading the durable earnings summary", async () => {
    Object.assign(globalThis, { React });
    mocks.auth.mockResolvedValue({
      user: {
        id: "dev_123",
        email: "dev@example.test",
      },
    });
    mocks.mintToken.mockReturnValue("tok_developer");
    mocks.flushPendingForRead.mockImplementationOnce(async () => {
      mocks.events.push("flush");
    });
    mocks.listByDeveloper.mockImplementationOnce(async () => {
      mocks.events.push("listByDeveloper");
      return [];
    });

    const element = await DeveloperDashboardLayout({ children: "content" });

    expect(mocks.mintToken).toHaveBeenCalledWith("dev_123", {
      email: "dev@example.test",
      role: "developer",
    });
    expect(mocks.flushPendingForRead).toHaveBeenCalledWith(
      expect.any(Object),
      "developer-dashboard",
    );
    expect(mocks.listByDeveloper).toHaveBeenCalledWith("dev_123");
    expect(mocks.events).toEqual(["flush", "listByDeveloper"]);
    expect(element.props.user).toEqual({
      email: "dev@example.test",
      userId: "dev_123",
    });
  });

  it("passes the durable signup bonus to Recent credit as a pinned activity", async () => {
    Object.assign(globalThis, { React });
    mocks.auth.mockResolvedValue({
      user: {
        id: "dev_123",
        email: "dev@example.test",
      },
    });
    mocks.mintToken.mockReturnValue("tok_developer");
    mocks.listByDeveloper.mockResolvedValue([
      {
        entryId: "signup_bonus:dev_123",
        type: "signup_bonus",
        campaignId: "",
        developerId: "dev_123",
        revenueMicrocents: 0,
        developerCreditCents: 100,
        spinshareRetentionMicrocents: 0,
        creditCents: 100,
        createdAtMs: 1234,
      },
    ]);

    const element = await DeveloperDashboardLayout({ children: "content" });
    const activityProvider = element.props.children;

    expect(activityProvider.props.pinnedActivities).toEqual([
      {
        activityId: "signup_bonus:dev_123",
        campaignId: "—",
        type: "welcome_gift",
        status: "credited",
        amountCents: 100,
        amountUsd: "1.00",
        createdAtMs: 1234,
      },
    ]);
  });
});
