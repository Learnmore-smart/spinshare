import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { StripeGateway } from "./stripe-gateway";
import { stripeCheckoutSessionToFunding } from "./stripe-gateway";

describe("StripeGateway", () => {
  it("keeps checkout session id when parsing completed checkout webhooks", () => {
    const webhookSecret = "whsec_test_spinshare";
    const payload = JSON.stringify({
      id: "evt_test_checkout_completed",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          object: "checkout.session",
          metadata: { campaignId: "cmp_test_123" },
          client_reference_id: "cmp_fallback",
          amount_total: 500,
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    const gateway = new StripeGateway({
      STRIPE_SECRET_KEY: "sk_test_spinshare",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    });

    const event = gateway.verifyAndParseWebhook(
      Buffer.from(payload, "utf8"),
      signature,
    );

    expect(event).toEqual({
      id: "evt_test_checkout_completed",
      type: "checkout.session.completed",
      checkoutSessionId: "cs_test_123",
      campaignId: "cmp_test_123",
      amountCents: 500,
    });
  });

  it("projects paid checkout sessions to funding details", () => {
    expect(
      stripeCheckoutSessionToFunding({
        id: "cs_test_paid",
        payment_status: "paid",
        metadata: { campaignId: "cmp_meta" },
        client_reference_id: "cmp_fallback",
        amount_total: 500,
      }),
    ).toEqual({
      sessionId: "cs_test_paid",
      status: "paid",
      campaignId: "cmp_meta",
      amountCents: 500,
    });
  });

  it("falls back to client_reference_id and preserves unpaid status", () => {
    expect(
      stripeCheckoutSessionToFunding({
        id: "cs_test_open",
        payment_status: "unpaid",
        metadata: {},
        client_reference_id: "cmp_reference",
        amount_total: 700,
      }),
    ).toEqual({
      sessionId: "cs_test_open",
      status: "unpaid",
      campaignId: "cmp_reference",
      amountCents: 700,
    });
  });
});
