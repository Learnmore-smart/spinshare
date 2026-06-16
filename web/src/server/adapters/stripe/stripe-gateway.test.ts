import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { StripeGateway } from "./stripe-gateway";

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
});
