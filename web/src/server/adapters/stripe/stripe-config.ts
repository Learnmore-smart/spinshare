import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-05-27.dahlia";
export const STRIPE_API_BASE_URL = "https://api.stripe.com";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
  });
}
