import { describe, expect, it } from "vitest";

import {
  CHECKOUT_STATUS_MAX_POLLS,
  CHECKOUT_FUNDED_MARKET_REFRESH_EVENT,
  checkoutStatusCopy,
  readCheckoutReturn,
  shouldNotifyMarketRefresh,
  shouldPollCheckoutStatus,
  type CheckoutStatusViewState,
} from "./checkout-status-banner";

describe("checkout status banner helpers", () => {
  it("ignores ordinary homepage visits", () => {
    expect(readCheckoutReturn("")).toEqual({ kind: "none" });
    expect(readCheckoutReturn("?utm_source=test")).toEqual({ kind: "none" });
  });

  it("detects cancelled checkout returns", () => {
    expect(readCheckoutReturn("?checkout=cancelled")).toEqual({
      kind: "cancelled",
    });
    expect(readCheckoutReturn("?funding=cancelled")).toEqual({
      kind: "cancelled",
    });
  });

  it("captures successful checkout session ids", () => {
    expect(
      readCheckoutReturn("?checkout=success&checkout_session_id=cs_test_123"),
    ).toEqual({
      kind: "success",
      sessionId: "cs_test_123",
    });
    expect(
      readCheckoutReturn("?funding=success&checkout_session_id=cs_dash_123"),
    ).toEqual({
      kind: "success",
      sessionId: "cs_dash_123",
    });
  });

  it("explains pending webhook state", () => {
    const state: CheckoutStatusViewState = {
      kind: "pending_webhook",
      sessionId: "cs_pending",
      campaign: {
        id: "cmp_pending",
        budgetCents: 0,
        publicOnLeaderboard: true,
        biddable: false,
        leaderboardEligible: false,
      },
    };

    expect(checkoutStatusCopy(state)).toMatchObject({
      title: "Payment returned from Stripe",
      body: "SpinShare is waiting for the Stripe webhook to fund this campaign. Refresh in a moment if it does not appear yet.",
      tone: "pending",
    });
  });

  it("explains funded leaderboard eligibility", () => {
    const state: CheckoutStatusViewState = {
      kind: "funded",
      sessionId: "cs_funded",
      campaign: {
        id: "cmp_funded",
        budgetCents: 500,
        publicOnLeaderboard: true,
        biddable: true,
        leaderboardEligible: true,
      },
    };

    expect(checkoutStatusCopy(state)).toMatchObject({
      title: "Campaign funded",
      body: "Your ad is funded and eligible for the public leaderboard.",
      tone: "success",
    });
  });

  it("explains why a funded campaign may not show publicly", () => {
    const state: CheckoutStatusViewState = {
      kind: "funded",
      sessionId: "cs_private",
      campaign: {
        id: "cmp_private",
        budgetCents: 500,
        publicOnLeaderboard: false,
        biddable: true,
        leaderboardEligible: false,
      },
    };

    expect(checkoutStatusCopy(state)).toMatchObject({
      title: "Campaign funded",
      body: "Your ad is funded, but it is not on the public leaderboard because public listing is turned off.",
      tone: "success",
    });
  });

  it("polls only bounded pending states", () => {
    const pending: CheckoutStatusViewState = {
      kind: "pending_webhook",
      sessionId: "cs_pending",
    };
    const unknown: CheckoutStatusViewState = {
      kind: "unknown",
      sessionId: "cs_unknown",
    };
    const funded: CheckoutStatusViewState = {
      kind: "funded",
      sessionId: "cs_funded",
    };

    expect(shouldPollCheckoutStatus(pending, 0)).toBe(true);
    expect(shouldPollCheckoutStatus(unknown, 0)).toBe(true);
    expect(shouldPollCheckoutStatus(funded, 0)).toBe(false);
    expect(shouldPollCheckoutStatus({ kind: "cancelled" }, 0)).toBe(false);
    expect(shouldPollCheckoutStatus({ kind: "error", sessionId: "cs_err" }, 0)).toBe(false);
    expect(shouldPollCheckoutStatus(pending, CHECKOUT_STATUS_MAX_POLLS)).toBe(false);
  });

  it("notifies the homepage market only when checkout becomes funded", () => {
    const hidden: CheckoutStatusViewState = { kind: "hidden" };
    const pending: CheckoutStatusViewState = {
      kind: "pending_webhook",
      sessionId: "cs_pending",
    };
    const funded: CheckoutStatusViewState = {
      kind: "funded",
      sessionId: "cs_funded",
      campaign: {
        id: "cmp_funded",
        budgetCents: 500,
        publicOnLeaderboard: true,
        biddable: true,
        leaderboardEligible: true,
      },
    };

    expect(CHECKOUT_FUNDED_MARKET_REFRESH_EVENT).toBe(
      "spinshare:checkout-funded",
    );
    expect(shouldNotifyMarketRefresh(hidden, pending)).toBe(false);
    expect(shouldNotifyMarketRefresh(pending, funded)).toBe(true);
    expect(shouldNotifyMarketRefresh(funded, funded)).toBe(false);
  });
});
