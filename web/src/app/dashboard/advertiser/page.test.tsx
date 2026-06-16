import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  mintToken: vi.fn(),
}));

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    auth: {
      mintToken: mocks.mintToken,
    },
  }),
}));

vi.mock("./advertiser-dashboard-shell", () => ({
  AdvertiserDashboardShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./advertiser-dashboard-context", () => ({
  AdvertiserDashboardProviderClient: ({ children, token }: { children: React.ReactNode; token: string }) => (
    <div data-testid="provider" data-token={token}>{children}</div>
  ),
}));

import AdvertiserDashboardLayout from "./layout";

describe("AdvertiserDashboardLayout", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.mintToken.mockReset();
  });

  it("mints the dashboard token with the session email so homepage purchases can be claimed", async () => {
    Object.assign(globalThis, { React });
    mocks.auth.mockResolvedValue({
      user: {
        id: "google:buyer-123",
        email: "Buyer@Example.com",
      },
    });
    mocks.mintToken.mockReturnValue("tok_claims");

    const element = await AdvertiserDashboardLayout({ children: "content" });

    expect(mocks.mintToken).toHaveBeenCalledWith("google:buyer-123", {
      email: "Buyer@Example.com",
      role: "advertiser",
    });

    const provider = element.props.children;
    expect(provider.props.token).toBe("tok_claims");
  });
});
