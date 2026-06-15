/**
 * Stripe adapters barrel.
 *
 * Concrete production {@link PaymentGateway} implementation backed by the
 * Stripe SDK, selected at the composition root (`container.ts`) when
 * `STRIPE_MODE` is `test` or `live`. Credential-tolerant: never touches Stripe
 * at import time. See design "Provider Abstraction Layer (Ports)".
 */

export { StripeGateway, type StripeGatewayEnv } from "./stripe-gateway";
export { StripePayoutGateway } from "./stripe-payout-gateway";
