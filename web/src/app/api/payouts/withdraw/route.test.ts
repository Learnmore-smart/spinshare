import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  recordActivity: vi.fn(),
  withdrawBalance: vi.fn(),
  withdrawalsEnabled: true,
}));

// Cash-outs are disabled platform-wide in production (PAYOUT_WITHDRAWALS_ENABLED
// === false). Mock the flag so the result-mapping tests can exercise the enabled
// path, while a dedicated test flips it off to assert the kill switch.
vi.mock("@spinshare/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@spinshare/core")>();
  return {
    ...actual,
    get PAYOUT_WITHDRAWALS_ENABLED() {
      return mocks.withdrawalsEnabled;
    },
  };
});

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    users: {},
    payouts: {},
    payoutAttempts: {},
    activities: {
      record: mocks.recordActivity,
    },
  }),
}));

vi.mock("@/server/payout-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/payout-service")>();
  return {
    ...actual,
    withdrawBalance: mocks.withdrawBalance,
  };
});

import { POST } from "./route";

function sameOriginRequest(): Request {
  return new Request("https://spinshare.test/api/payouts/withdraw", {
    method: "POST",
    headers: {
      host: "spinshare.test",
      origin: "https://spinshare.test",
    },
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.recordActivity.mockReset();
  mocks.withdrawBalance.mockReset();
  mocks.withdrawalsEnabled = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/payouts/withdraw", () => {
  it("refuses the withdrawal while cash-outs are disabled platform-wide", async () => {
    mocks.withdrawalsEnabled = false;

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "withdrawals_disabled" });
    expect(mocks.withdrawBalance).not.toHaveBeenCalled();
    expect(mocks.recordActivity).not.toHaveBeenCalled();
  });

  it("returns paid-out amount and provider id on success", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "dev@example.test" },
    });
    mocks.withdrawBalance.mockResolvedValueOnce({
      ok: true,
      paidOutCents: 1234,
      payoutId: "tr_123",
    });

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      paidOutCents: 1234,
      paidOutUsd: "12.34",
      payoutId: "tr_123",
    });
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: "payout_paid_tr_123",
        campaignId: "payout",
        type: "developer_event",
        developerId: "dev_123",
        status: "payoutPaid",
        amountCents: 1234,
        amountUsd: "12.34",
        providerEventId: "tr_123",
      }),
    );
  });

  it("passes through typed service failures", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "dev@example.test" },
    });
    mocks.withdrawBalance.mockResolvedValueOnce({
      ok: false,
      status: 422,
      error: "below_minimum",
    });

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ error: "below_minimum" });
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "payout",
        type: "developer_event",
        developerId: "dev_123",
        status: "payoutBlocked",
        providerCode: "below_minimum",
      }),
    );
  });

  it("returns sanitized provider details when Stripe transfer fails", async () => {
    const providerError = Object.assign(new Error("card secret leaked"), {
      requestId: "req_payout_123",
      statusCode: 402,
      code: "balance_insufficient",
      headers: { authorization: "Bearer sk_test_secret" },
    });

    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "dev@example.test" },
    });
    mocks.withdrawBalance.mockRejectedValueOnce(providerError);

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "payout_withdraw_failed",
      message:
        "Stripe Connect rejected the payout transfer. Check the request id in Stripe logs.",
      requestId: "req_payout_123",
      providerStatus: 402,
      providerCode: "balance_insufficient",
    });
    expect(JSON.stringify(body)).not.toContain("sk_test_secret");
    expect(JSON.stringify(body)).not.toContain("card secret leaked");
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "payout",
        type: "developer_event",
        developerId: "dev_123",
        status: "payoutFailed",
        providerEventId: "req_payout_123",
        providerStatus: 402,
        providerCode: "balance_insufficient",
      }),
    );
  });
});
