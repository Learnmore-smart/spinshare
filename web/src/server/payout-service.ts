/**
 * Payout service — the money-moving core behind `POST /api/payouts/withdraw`.
 *
 * Extracted from the route (which stays a thin HTTP adapter) so the financial
 * logic is unit-testable against the in-memory user repo + mock payout gateway,
 * mirroring how {@link recordImpression} relates to `POST /api/track`.
 *
 * {@link withdrawBalance} pays out the developer's **durable** balance (only
 * flushed, reconciled earnings — never the unflushed hot-path delta), and only
 * when:
 *   - a connected Stripe account exists, and Stripe reports it cleared for
 *     payouts (`payouts_enabled`) — otherwise `409 not_connected`; and
 *   - the balance meets the {@link MINIMUM_PAYOUT_CENTS} threshold — otherwise
 *     `422 below_minimum`.
 * On success it transfers the funds and debits the balance by exactly the
 * amount paid out (an atomic delta, so concurrent credits are never lost).
 */

import { MINIMUM_PAYOUT_CENTS } from "@spinshare/core";

import type { PayoutGateway, UserRepository } from "./ports";

/** Dependencies for the payout service (supplied by the composition root). */
export interface PayoutServiceDeps {
  /** Durable user records (balance is the authoritative payable amount). */
  users: UserRepository;
  /** Stripe Connect payout gateway (or the mock gateway locally). */
  payouts: PayoutGateway;
}

/** Failure status codes the route maps directly to HTTP responses. */
export type WithdrawErrorStatus = 409 | 422;

/** `409` error code: no connected account, or payouts not enabled yet. */
export const NOT_CONNECTED_ERROR = "not_connected" as const;
/** `422` error code: durable balance below the minimum payout. */
export const BELOW_MINIMUM_ERROR = "below_minimum" as const;

/**
 * Outcome of {@link withdrawBalance}: a successful payout or a typed failure the
 * route maps to a `409`/`422` status.
 */
export type WithdrawResult =
  | { ok: true; paidOutCents: number; payoutId: string }
  | { ok: false; status: WithdrawErrorStatus; error: string };

/**
 * Cashes out the developer's durable balance to their connected account.
 *
 * Never moves money on the failure paths. On success, transfers exactly the
 * current durable balance and debits it by the same amount.
 *
 * @param deps Injected user repo + payout gateway.
 * @param developerId The authenticated developer's stable user id.
 */
export async function withdrawBalance(
  deps: PayoutServiceDeps,
  developerId: string,
): Promise<WithdrawResult> {
  const { users, payouts } = deps;

  const user = await users.getById(developerId);
  if (!user?.stripeConnectAccountId) {
    return { ok: false, status: 409, error: NOT_CONNECTED_ERROR };
  }

  // Confirm payout eligibility with Stripe before moving any money.
  const status = await payouts.getAccountStatus(user.stripeConnectAccountId);
  if (!status.payoutsEnabled) {
    return { ok: false, status: 409, error: NOT_CONNECTED_ERROR };
  }

  const amountCents = user.balanceCents;
  if (amountCents < MINIMUM_PAYOUT_CENTS) {
    return { ok: false, status: 422, error: BELOW_MINIMUM_ERROR };
  }

  const result = await payouts.createPayout({
    accountId: user.stripeConnectAccountId,
    amountCents,
  });

  // Debit exactly what was paid out (atomic delta; concurrent credits are safe).
  await users.applyBalanceDeltaCents(developerId, -result.amountCents);

  return {
    ok: true,
    paidOutCents: result.amountCents,
    payoutId: result.payoutId,
  };
}
