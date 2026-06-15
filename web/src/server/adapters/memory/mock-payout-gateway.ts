/**
 * Mock {@link PayoutGateway} — credential-free local/test stand-in for Stripe
 * Connect payouts.
 *
 * Lets the developer dashboard's "Connect payouts" / "Cash out" flow work
 * end-to-end with zero external dependencies (`STRIPE_MODE=mock`, the local
 * default):
 *   - `ensureConnectedAccount` mints a deterministic `acct_mock_*` id (or reuses
 *     an existing one).
 *   - `createOnboardingLink` returns a local URL that bounces straight back to
 *     the dashboard with `?payouts=connected`, simulating instant approval.
 *   - `getAccountStatus` reports a fully-onboarded, payouts-enabled account so
 *     local cash-outs succeed.
 *   - `createPayout` returns a deterministic `po_mock_*` payout id.
 *
 * See design "Local Development & Testability Strategy" and the
 * `PayoutGateway` port.
 */

import type {
  ConnectAccountStatus,
  EnsureConnectedAccountInput,
  OnboardingLinkInput,
  PayoutGateway,
  PayoutInput,
  PayoutResult,
} from "../../ports/payout-gateway";
import { RandomIdGenerator, type IdGenerator } from "./clock";

export class MockPayoutGateway implements PayoutGateway {
  constructor(private readonly ids: IdGenerator = new RandomIdGenerator()) {}

  async ensureConnectedAccount(
    input: EnsureConnectedAccountInput,
  ): Promise<{ accountId: string }> {
    if (input.existingAccountId && input.existingAccountId.length > 0) {
      return { accountId: input.existingAccountId };
    }
    return { accountId: this.ids.next("acct_mock") };
  }

  async createOnboardingLink(
    input: OnboardingLinkInput,
  ): Promise<{ url: string }> {
    // Bounce straight back to the dashboard's return URL with a success marker
    // so local onboarding "completes" instantly without leaving the app.
    const url = new URL(input.returnUrl);
    url.searchParams.set("payouts", "connected");
    return { url: url.toString() };
  }

  async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    // Mock accounts are always fully onboarded so local cash-outs work.
    return { accountId, payoutsEnabled: true, detailsSubmitted: true };
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    return { payoutId: this.ids.next("po_mock"), amountCents: input.amountCents };
  }
}
