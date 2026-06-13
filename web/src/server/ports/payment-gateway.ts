/**
 * PaymentGateway port — funding via Stripe.
 *
 * Backed by `StripeGateway` in production or `MockPaymentGateway` locally.
 * See design "API Contracts" (`/api/funds/checkout`, `/api/webhooks/stripe`).
 */

/**
 * Inputs to start a hosted checkout session for funding a campaign. `amountCents`
 * is validated to 100–10000000 cents ($1.00–$100,000.00) with one-cent precision
 * by the core schema before reaching the gateway.
 */
export interface CheckoutInput {
  /** Campaign to fund. */
  campaignId: string;
  /** Funding amount in integer cents (100–10000000). */
  amountCents: number;
  /** Optional redirect URL on successful payment. */
  successUrl?: string;
  /** Optional redirect URL when checkout is cancelled. */
  cancelUrl?: string;
}

/**
 * A verified, parsed Stripe webhook event. For `checkout.session.completed`,
 * `campaignId` and `amountCents` carry the confirmed funding; `id` is the
 * Stripe event id used as the `paymentEvents/{stripeEventId}` idempotency key.
 */
export interface StripeEvent {
  /** Stripe event id (idempotency key). */
  id: string;
  /** Event type, e.g. `"checkout.session.completed"`. */
  type: string;
  /** Funded campaign id. */
  campaignId: string;
  /** Confirmed funding amount in integer cents. */
  amountCents: number;
}

/** Payment gateway for checkout sessions and webhook verification. */
export interface PaymentGateway {
  /** Creates a hosted checkout session, returning its URL and session id. */
  createCheckoutSession(
    input: CheckoutInput,
  ): Promise<{ url: string; sessionId: string }>;
  /**
   * Verifies the raw webhook body against the signature and parses it.
   * Throws if the signature is invalid (caller returns 400, no mutation).
   */
  verifyAndParseWebhook(rawBody: Buffer, signature: string): StripeEvent;
}
