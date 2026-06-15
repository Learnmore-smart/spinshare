/**
 * StripePayoutGateway — production {@link PayoutGateway} backed by Stripe
 * Connect (Express).
 *
 * Selected at the composition root when `STRIPE_MODE` is `test` or `live`
 * (local/test runs use {@link MockPayoutGateway}). Reads `STRIPE_SECRET_KEY`
 * from the environment, lazily, on first credentialed use — constructing the
 * gateway never touches Stripe, so builds/type-checks/module loads work without
 * keys (mirrors {@link StripeGateway}).
 *
 * Flow:
 *   - {@link ensureConnectedAccount} creates an Express connected account
 *     (`accounts.create`) or reuses the developer's existing one.
 *   - {@link createOnboardingLink} creates an `account_onboarding` Account Link
 *     the dashboard redirects to.
 *   - {@link getAccountStatus} reads `payouts_enabled` / `details_submitted`.
 *   - {@link createPayout} moves the developer's earnings from the platform
 *     balance to the connected account via `transfers.create` (Stripe then pays
 *     out to the developer's bank per the account's payout schedule).
 *
 * See the `PayoutGateway` port and design "Provider Abstraction Layer (Ports)".
 */

import Stripe from "stripe";

import type {
  ConnectAccountStatus,
  EnsureConnectedAccountInput,
  OnboardingLinkInput,
  PayoutGateway,
  PayoutInput,
  PayoutResult,
} from "../../ports/payout-gateway";
import type { StripeGatewayEnv } from "./stripe-gateway";

/** Fixed currency for all payouts (amounts are US-dollar cents). */
const CURRENCY = "usd";

export class StripePayoutGateway implements PayoutGateway {
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
          "STRIPE_SECRET_KEY is not set. Provide it to manage Connect payouts, " +
            "or use STRIPE_MODE=mock for local development.",
        );
      }
      this.client = new Stripe(secretKey);
    }
    return this.client;
  }

  async ensureConnectedAccount(
    input: EnsureConnectedAccountInput,
  ): Promise<{ accountId: string }> {
    if (input.existingAccountId && input.existingAccountId.length > 0) {
      return { accountId: input.existingAccountId };
    }
    const client = this.getClient();
    const account = await client.accounts.create({
      type: "express",
      ...(input.email !== undefined ? { email: input.email } : {}),
      capabilities: { transfers: { requested: true } },
      // Link the connected account back to the platform user for reconciliation.
      metadata: { userId: input.userId },
    });
    return { accountId: account.id };
  }

  async createOnboardingLink(
    input: OnboardingLinkInput,
  ): Promise<{ url: string }> {
    const client = this.getClient();
    const link = await client.accountLinks.create({
      account: input.accountId,
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
      type: "account_onboarding",
    });
    return { url: link.url };
  }

  async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    const client = this.getClient();
    const account = await client.accounts.retrieve(accountId);
    return {
      accountId,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
    };
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    const client = this.getClient();
    // Move funds from the platform balance to the connected account. Stripe then
    // pays the developer's bank per the account's payout schedule.
    const transfer = await client.transfers.create({
      amount: input.amountCents,
      currency: CURRENCY,
      destination: input.accountId,
    });
    return { payoutId: transfer.id, amountCents: input.amountCents };
  }
}
