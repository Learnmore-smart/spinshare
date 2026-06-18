import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getById: vi.fn(),
  setConnectAccount: vi.fn(),
  ensureConnectedAccount: vi.fn(),
  createOnboardingLink: vi.fn(),
  flushPendingForRead: vi.fn(),
}));

vi.mock("@/server/adapters/auth/nextauth-config", () => ({
  auth: mocks.auth,
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    users: {
      getById: mocks.getById,
      setConnectAccount: mocks.setConnectAccount,
    },
    payouts: {
      ensureConnectedAccount: mocks.ensureConnectedAccount,
      createOnboardingLink: mocks.createOnboardingLink,
    },
  }),
}));

vi.mock("@/server/flush-before-read", () => ({
  flushPendingForRead: mocks.flushPendingForRead,
}));

import { POST } from "./route";

function sameOriginRequest(): Request {
  return new Request("https://spinshare.test/api/payouts/connect", {
    method: "POST",
    headers: {
      host: "spinshare.test",
      origin: "https://spinshare.test",
    },
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.getById.mockReset();
  mocks.setConnectAccount.mockReset();
  mocks.ensureConnectedAccount.mockReset();
  mocks.createOnboardingLink.mockReset();
  mocks.flushPendingForRead.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/payouts/connect", () => {
  it("returns an onboarding URL and persists the connected account id", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "session@example.com" },
    });
    mocks.getById.mockResolvedValueOnce({
      email: "dev@example.com",
      balanceCents: 500,
      payoutsEnabled: false,
    });
    mocks.ensureConnectedAccount.mockResolvedValueOnce({
      accountId: "acct_123",
    });
    mocks.createOnboardingLink.mockResolvedValueOnce({
      url: "https://connect.stripe.com/setup/acct_123",
    });

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: "https://connect.stripe.com/setup/acct_123" });
    expect(mocks.ensureConnectedAccount).toHaveBeenCalledWith({
      userId: "dev_123",
      email: "dev@example.com",
    });
    expect(mocks.setConnectAccount).toHaveBeenCalledWith("dev_123", {
      stripeConnectAccountId: "acct_123",
      payoutsEnabled: false,
    });
  });

  it("returns sanitized provider details instead of a generic 500", async () => {
    const providerError = Object.assign(new Error("invalid request"), {
      requestId: "req_123",
      statusCode: 400,
      code: "invalid_request",
      headers: { authorization: "Bearer sk_test_secret" },
    });

    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "session@example.com" },
    });
    mocks.getById.mockResolvedValueOnce({
      email: "dev@example.com",
      balanceCents: 500,
      payoutsEnabled: false,
    });
    mocks.ensureConnectedAccount.mockRejectedValueOnce(providerError);

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "payout_connect_failed",
      message:
        "Stripe Connect rejected the payout onboarding request. Check the request id in Stripe logs.",
      requestId: "req_123",
      providerStatus: 400,
      providerCode: "invalid_request",
    });
    expect(JSON.stringify(body)).not.toContain("sk_test_secret");
  });

  it("maps known Stripe Connect setup blockers to an actionable response", async () => {
    const providerError = Object.assign(
      new Error("You can only create new accounts if you've signed up for Connect"),
      {
        requestId: "req_connect_123",
        statusCode: 400,
        code: "platform_registration_required",
      },
    );

    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "session@example.com" },
    });
    mocks.getById.mockResolvedValueOnce({
      email: "dev@example.com",
      balanceCents: 500,
      payoutsEnabled: false,
    });
    mocks.ensureConnectedAccount.mockRejectedValueOnce(providerError);

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "payout_connect_failed",
      reason: "stripe_connect_not_enabled",
      message:
        "Stripe Connect is not enabled for this Stripe account. Enable Connect in Stripe Dashboard, then retry.",
      requestId: "req_connect_123",
      providerStatus: 400,
      providerCode: "platform_registration_required",
    });
  });

  it("blocks Stripe onboarding below the payout minimum", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "dev_123", email: "session@example.com" },
    });
    mocks.getById.mockResolvedValueOnce({
      email: "dev@example.com",
      balanceCents: 499,
      payoutsEnabled: false,
    });

    const response = await POST(sameOriginRequest());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      error: "below_minimum",
      balanceCents: 499,
      minimumCents: 500,
    });
    expect(mocks.flushPendingForRead).toHaveBeenCalled();
    expect(mocks.ensureConnectedAccount).not.toHaveBeenCalled();
    expect(mocks.createOnboardingLink).not.toHaveBeenCalled();
    expect(mocks.setConnectAccount).not.toHaveBeenCalled();
  });
});
