import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getById: vi.fn(),
  setConnectAccount: vi.fn(),
  getAccountStatus: vi.fn(),
  flushPendingForRead: vi.fn(),
  events: [] as string[],
}));

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/flush-before-read", () => ({
  flushPendingForRead: mocks.flushPendingForRead,
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    users: {
      getById: mocks.getById,
      setConnectAccount: mocks.setConnectAccount,
    },
    payouts: {
      getAccountStatus: mocks.getAccountStatus,
    },
  }),
}));

import { GET } from "./route";

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.getById.mockReset();
  mocks.setConnectAccount.mockReset();
  mocks.getAccountStatus.mockReset();
  mocks.flushPendingForRead.mockReset();
  mocks.events.length = 0;
});

describe("GET /api/payouts/status", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(mocks.flushPendingForRead).not.toHaveBeenCalled();
  });

  it("flushes pending ledger work before reading durable payout balance", async () => {
    const containerMarker = expect.any(Object);
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "dev@example.test" },
    });
    mocks.flushPendingForRead.mockImplementationOnce(async () => {
      mocks.events.push("flush");
    });
    mocks.getById.mockImplementationOnce(async () => {
      mocks.events.push("getById");
      return {
        id: "dev_123",
        email: "dev@example.test",
        provider: "github",
        role: "developer",
        balanceCents: 42,
      };
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      connected: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      balanceCents: 42,
    });
    expect(mocks.flushPendingForRead).toHaveBeenCalledWith(
      containerMarker,
      "payouts-status",
    );
    expect(mocks.events).toEqual(["flush", "getById"]);
  });

  it("refreshes Connect status for connected accounts after the balance flush", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "dev@example.test" },
    });
    mocks.flushPendingForRead.mockResolvedValueOnce(undefined);
    mocks.getById.mockResolvedValueOnce({
      id: "dev_123",
      email: "dev@example.test",
      provider: "github",
      role: "developer",
      balanceCents: 900,
      stripeConnectAccountId: "acct_123",
      payoutsEnabled: false,
    });
    mocks.getAccountStatus.mockResolvedValueOnce({
      payoutsEnabled: true,
      detailsSubmitted: true,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      connected: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      balanceCents: 900,
    });
    expect(mocks.setConnectAccount).toHaveBeenCalledWith("dev_123", {
      stripeConnectAccountId: "acct_123",
      payoutsEnabled: true,
    });
  });
});
