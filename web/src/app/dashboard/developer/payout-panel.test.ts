import { describe, expect, it } from "vitest";

import {
  formatPayoutFailureMessage,
  getPayoutButtonState,
} from "./payout-panel";

const copy = {
  generic: "Something went wrong. Please try again.",
  connectNotEnabled: "Connect is not enabled.",
  withRequestId: (message: string, requestId: string) =>
    `${message} Request ${requestId}.`,
};

const buttonCopy = {
  connectPayouts: "Connect payouts",
  payoutFinishOnboarding: "Finish payout setup",
  payoutVerificationPending: "Stripe is verifying",
  payoutComingSoon: "Cash-out coming soon",
  payoutLockedUntilMinimum: (minimum: string) => `Unlock payouts at ${minimum}`,
  payoutConnecting: "Opening secure onboarding...",
  payoutProcessing: "Processing payout...",
  cashOut: (amount: string) => `Cash out ${amount}`,
};

describe("formatPayoutFailureMessage", () => {
  it("maps known Connect setup blockers to localized copy with the request id", () => {
    expect(
      formatPayoutFailureMessage(
        {
          reason: "stripe_connect_not_enabled",
          message: "Stripe Connect is not enabled for this account.",
          requestId: "req_123",
        },
        copy,
      ),
    ).toBe("Connect is not enabled. Request req_123.");
  });

  it("surfaces sanitized server messages with Stripe request ids", () => {
    expect(
      formatPayoutFailureMessage(
        {
          message:
            "Stripe Connect rejected the payout onboarding request. Check the request id in Stripe logs.",
          requestId: "req_456",
        },
        copy,
      ),
    ).toBe(
      "Stripe Connect rejected the payout onboarding request. Check the request id in Stripe logs. Request req_456.",
    );
  });

  it("keeps the generic fallback for malformed responses", () => {
    expect(formatPayoutFailureMessage({ error: "unknown" }, copy)).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("getPayoutButtonState", () => {
  it("does not offer Stripe Connect before the payout minimum is earned", () => {
    expect(
      getPayoutButtonState({
        status: {
          connected: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          balanceCents: 0,
        },
        phase: "idle",
        eligible: false,
        balanceLabel: "$0.00",
        minimumLabel: "$10.00",
        copy: buttonCopy,
      }),
    ).toEqual({
      action: null,
      disabled: true,
      label: "Unlock payouts at $10.00",
    });
  });

  it("shows Stripe verification instead of finish setup after details are submitted", () => {
    expect(
      getPayoutButtonState({
        status: {
          connected: true,
          payoutsEnabled: false,
          detailsSubmitted: true,
          balanceCents: 1000,
        },
        phase: "idle",
        eligible: true,
        balanceLabel: "$10.00",
        minimumLabel: "$10.00",
        copy: buttonCopy,
      }),
    ).toEqual({
      action: null,
      disabled: true,
      label: "Stripe is verifying",
    });
  });

  it("shows a disabled 'coming soon' button instead of cash-out while withdrawals are off", () => {
    // PAYOUT_WITHDRAWALS_ENABLED is false: a fully connected, eligible developer
    // must not be offered a working cash-out — only a disabled coming-soon state.
    expect(
      getPayoutButtonState({
        status: {
          connected: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
          balanceCents: 1500,
        },
        phase: "idle",
        eligible: true,
        balanceLabel: "$15.00",
        minimumLabel: "$10.00",
        copy: buttonCopy,
      }),
    ).toEqual({
      action: null,
      disabled: true,
      label: "Cash-out coming soon",
    });
  });
});
