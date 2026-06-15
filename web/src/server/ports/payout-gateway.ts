/**
 * PayoutGateway port — developer payouts via Stripe Connect (Express).
 *
 * Backed by `StripePayoutGateway` in production (`STRIPE_MODE=test|live`) or
 * `MockPayoutGateway` locally (`STRIPE_MODE=mock`). The developer dashboard's
 * "Connect payouts" / "Cash out" actions are thin HTTP adapters over this port:
 *
 *   - {@link ensureConnectedAccount} creates (or reuses) the developer's Stripe
 *     Express connected account.
 *   - {@link createOnboardingLink} returns a hosted onboarding URL the dashboard
 *     redirects to so the developer can submit their bank/identity details.
 *   - {@link getAccountStatus} reports whether onboarding is complete and the
 *     account is cleared to receive payouts.
 *   - {@link createPayout} transfers an available balance to the connected
 *     account.
 *
 * Credential tolerance mirrors {@link PaymentGateway}: implementations must not
 * touch Stripe at import time; only credentialed calls require
 * `STRIPE_SECRET_KEY`.
 */

/** Inputs to create or reuse a developer's connected account. */
export interface EnsureConnectedAccountInput {
  /** Stable platform user id of the developer (for metadata/idempotency). */
  userId: string;
  /** Developer email, prefilled into Stripe onboarding when available. */
  email?: string;
  /** Existing connected account id to reuse, when the developer already has one. */
  existingAccountId?: string;
}

/** Inputs to create a hosted Connect onboarding link. */
export interface OnboardingLinkInput {
  /** Connected account being onboarded. */
  accountId: string;
  /** URL Stripe returns the developer to after completing/leaving onboarding. */
  returnUrl: string;
  /** URL Stripe sends the developer to if the onboarding link expires. */
  refreshUrl: string;
}

/** Onboarding / payout-eligibility status of a connected account. */
export interface ConnectAccountStatus {
  /** The connected account id. */
  accountId: string;
  /** Whether Stripe has cleared the account to receive payouts. */
  payoutsEnabled: boolean;
  /** Whether the developer has submitted all required onboarding details. */
  detailsSubmitted: boolean;
}

/** Inputs to pay out an available balance to a connected account. */
export interface PayoutInput {
  /** Destination connected account. */
  accountId: string;
  /** Amount to pay out, in integer cents. */
  amountCents: number;
}

/** Result of a successful payout. */
export interface PayoutResult {
  /** Stripe payout/transfer id (for reconciliation/audit). */
  payoutId: string;
  /** Amount paid out, in integer cents. */
  amountCents: number;
}

/** Developer payouts via Stripe Connect. */
export interface PayoutGateway {
  /** Creates or reuses the developer's connected account, returning its id. */
  ensureConnectedAccount(
    input: EnsureConnectedAccountInput,
  ): Promise<{ accountId: string }>;
  /** Returns a hosted onboarding URL for the connected account. */
  createOnboardingLink(input: OnboardingLinkInput): Promise<{ url: string }>;
  /** Reads the current onboarding / payout-eligibility status. */
  getAccountStatus(accountId: string): Promise<ConnectAccountStatus>;
  /** Pays out an available balance to the connected account. */
  createPayout(input: PayoutInput): Promise<PayoutResult>;
}
