/**
 * StripeGateway — production {@link PaymentGateway} backed by the Stripe SDK.
 *
 * Selected at the composition root when `STRIPE_MODE` is `test` or `live`
 * (local/test runs use {@link MockPaymentGateway}). Reads credentials from the
 * environment:
 *   - `STRIPE_SECRET_KEY`    — secret API key used to create checkout sessions.
 *   - `STRIPE_WEBHOOK_SECRET`— signing secret used to verify webhook payloads.
 *
 * Credential tolerance: this module never touches Stripe at import time and the
 * constructor never throws when keys are absent. The Stripe client is created
 * lazily on first use, and only the method that actually needs a given
 * credential fails (with a clear message) if it is missing. This keeps builds,
 * type-checks, and module loads working in environments without Stripe creds
 * while still wiring the real gateway when `STRIPE_MODE=test|live`.
 *
 * See design "API Contracts" (`/api/funds/checkout`, `/api/webhooks/stripe`)
 * and the `PaymentGateway` port.
 */

import Stripe from "stripe";

import type {
  CheckoutInput,
  CheckoutSessionResult,
  PaymentGateway,
  StripeEvent,
} from "../../ports/payment-gateway";
import { createStripeClient } from "./stripe-config";

/** Minimal read-only view of the environment the gateway depends on. */
export type StripeGatewayEnv = Record<string, string | undefined>;

/** Stripe event type emitted when a hosted checkout completes successfully. */
const CHECKOUT_COMPLETED = "checkout.session.completed";

/** Fixed currency for all funding (amounts are US-dollar cents). */
const CURRENCY = "usd";

export class StripeGateway implements PaymentGateway {
  /** Lazily-initialized Stripe client; absent until first credentialed use. */
  private client: Stripe | undefined;

  constructor(private readonly env: StripeGatewayEnv = process.env) {}

  /**
   * Returns the lazily-initialized Stripe client, creating it from
   * `STRIPE_SECRET_KEY` on first use. Throws a clear error when the key is
   * absent so misconfiguration surfaces at call time, never at import/build.
   */
  private getClient(): Stripe {
    if (this.client === undefined) {
      const secretKey = this.env.STRIPE_SECRET_KEY;
      if (secretKey === undefined || secretKey.length === 0) {
        throw new Error(
          "STRIPE_SECRET_KEY is not set. Provide it to create checkout " +
            "sessions, or use STRIPE_MODE=mock for local development.",
        );
      }
      this.client = createStripeClient(secretKey);
    }
    return this.client;
  }

  /** Returns the configured webhook signing secret or throws if absent. */
  private getWebhookSecret(): string {
    const secret = this.env.STRIPE_WEBHOOK_SECRET;
    if (secret === undefined || secret.length === 0) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is not set. Provide it to verify webhook " +
          "signatures, or use STRIPE_MODE=mock for local development.",
      );
    }
    return secret;
  }

  async createCheckoutSession(
    input: CheckoutInput,
  ): Promise<CheckoutSessionResult> {
    const client = this.getClient();

    const session = await client.checkout.sessions.create({
      mode: "payment",
      // Carry the funded campaign through so the webhook can attribute the
      // confirmed payment back to it.
      client_reference_id: input.campaignId,
      metadata: { campaignId: input.campaignId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: input.amountCents,
            product_data: { name: `SpinShare campaign funding (${input.campaignId})` },
          },
        },
      ],
      ...(input.customerEmail !== undefined
        ? { customer_email: input.customerEmail }
        : {}),
      ...(input.successUrl !== undefined ? { success_url: input.successUrl } : {}),
      ...(input.cancelUrl !== undefined ? { cancel_url: input.cancelUrl } : {}),
    });

    if (session.url === null) {
      throw new Error("Stripe did not return a checkout URL for the session.");
    }
    return { url: session.url, sessionId: session.id };
  }

  verifyAndParseWebhook(rawBody: Buffer, signature: string): StripeEvent {
    const client = this.getClient();
    // Throws `Stripe.errors.StripeSignatureVerificationError` on a bad
    // signature; callers translate that to a 400 with no mutation.
    const event = client.webhooks.constructEvent(
      rawBody,
      signature,
      this.getWebhookSecret(),
    );
    return this.toStripeEvent(event);
  }

  /**
   * Projects a verified Stripe event onto the narrow {@link StripeEvent} the
   * rest of the system consumes. For completed checkout sessions the funded
   * `campaignId` comes from session metadata / `client_reference_id` and the
   * amount from `amount_total` (integer cents).
   */
  private toStripeEvent(event: Stripe.Event): StripeEvent {
    let campaignId = "";
    let amountCents = 0;

    if (event.type === CHECKOUT_COMPLETED) {
      const session = event.data.object as Stripe.Checkout.Session;
      campaignId =
        session.metadata?.campaignId ?? session.client_reference_id ?? "";
      amountCents = session.amount_total ?? 0;
    }

    return {
      id: event.id,
      type: event.type,
      campaignId,
      amountCents,
    };
  }
}
