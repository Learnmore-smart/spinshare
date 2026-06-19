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
 * On success it reserves the durable balance before calling Stripe, transfers
 * the funds, and records a provider reconciliation attempt.
 */

import type { User } from "@spinshare/core";
import {
  MINIMUM_PAYOUT_CENTS,
  SYBIL_PAYOUT_FINGERPRINT_THRESHOLD,
} from "@spinshare/core";

import type {
  PayoutAttemptRepository,
  PayoutGateway,
  UserRepository,
} from "./ports";

/**
 * Withdrawable balance: the total minus the not-yet-matured held bucket
 * (anti-fraud Tier 3a). Legacy users without a held split treat the whole
 * balance as available.
 */
function availableCents(user: Pick<User, "balanceCents" | "heldCents">): number {
  return user.balanceCents - (user.heldCents ?? 0);
}

/**
 * Verdict from a payout risk assessment (anti-fraud Tier 3c, prove-before-pay).
 * `block: true` stops the payout at the boundary even if the balance is matured
 * and eligible.
 */
export interface PayoutRiskVerdict {
  block: boolean;
  /** Machine-readable reason (recorded on the blocked attempt) when blocking. */
  reason?: string;
}

/** Dependencies for the payout service (supplied by the composition root). */
export interface PayoutServiceDeps {
  /** Durable user records (balance is the authoritative payable amount). */
  users: UserRepository;
  /** Stripe Connect payout gateway (or the mock gateway locally). */
  payouts: PayoutGateway;
  /** Durable provider/accounting reconciliation attempts. */
  payoutAttempts: PayoutAttemptRepository;
  /**
   * Optional payout-boundary risk gate (anti-fraud Tier 3c). When supplied and
   * it returns `block: true`, the payout is refused with {@link PAYOUT_RISK_ERROR}
   * before any money moves. Omitted ⇒ no gate (legacy/tests). Should fail-open
   * (return `block: false`) on its own internal errors so infrastructure faults
   * never strand a legitimate developer's earnings.
   */
  assessRisk?: (developerId: string) => Promise<PayoutRiskVerdict>;
  /** Clock override for deterministic tests. */
  nowMs?: () => number;
  /** Attempt id override for deterministic tests. */
  newAttemptId?: () => string;
}

/** Failure status codes the route maps directly to HTTP responses. */
export type WithdrawErrorStatus = 409 | 422;

/** `409` error code: no connected account, or payouts not enabled yet. */
export const NOT_CONNECTED_ERROR = "not_connected" as const;
/** `422` error code: durable balance below the minimum payout. */
export const BELOW_MINIMUM_ERROR = "below_minimum" as const;
/** `409` error code: another withdrawal changed the balance first. */
export const BALANCE_CHANGED_ERROR = "balance_changed" as const;
/** `409` error code: the payout risk gate blocked this withdrawal (Tier 3c/3b). */
export const PAYOUT_RISK_ERROR = "risk_hold" as const;
/** `reason` recorded when blocked for a payout fingerprint shared across accounts. */
export const SHARED_FINGERPRINT_REASON = "shared_payout_fingerprint" as const;

/**
 * Outcome of {@link withdrawBalance}: a successful payout or a typed failure the
 * route maps to a `409`/`422` status.
 */
export type WithdrawResult =
  | { ok: true; paidOutCents: number; payoutId: string }
  | { ok: false; status: WithdrawErrorStatus; error: string };

function newAttemptId(deps: PayoutServiceDeps): string {
  if (deps.newAttemptId) {
    return deps.newAttemptId();
  }
  return `poa_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function nowMs(deps: PayoutServiceDeps): number {
  return deps.nowMs?.() ?? Date.now();
}

function providerFailureDetails(error: unknown): {
  providerEventId?: string;
  providerStatus?: number;
  providerCode?: string;
} {
  const providerError = error as
    | {
        requestId?: unknown;
        statusCode?: unknown;
        code?: unknown;
      }
    | undefined;
  return {
    ...(typeof providerError?.requestId === "string"
      ? { providerEventId: providerError.requestId }
      : {}),
    ...(typeof providerError?.statusCode === "number"
      ? { providerStatus: providerError.statusCode }
      : {}),
    ...(typeof providerError?.code === "string"
      ? { providerCode: providerError.code }
      : {}),
  };
}

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
  const { users, payouts, payoutAttempts } = deps;
  const attemptId = newAttemptId(deps);

  const user = await users.getById(developerId);
  if (!user?.stripeConnectAccountId) {
    const at = nowMs(deps);
    await payoutAttempts.record({
      attemptId,
      developerId,
      status: "blocked",
      providerCode: NOT_CONNECTED_ERROR,
      ...(user !== null ? { amountCents: availableCents(user) } : {}),
      createdAtMs: at,
      updatedAtMs: at,
    });
    return { ok: false, status: 409, error: NOT_CONNECTED_ERROR };
  }

  // Confirm payout eligibility with Stripe before moving any money.
  const status = await payouts.getAccountStatus(user.stripeConnectAccountId);
  if (!status.payoutsEnabled) {
    const at = nowMs(deps);
    await payoutAttempts.record({
      attemptId,
      developerId,
      status: "blocked",
      amountCents: availableCents(user),
      stripeConnectAccountId: user.stripeConnectAccountId,
      providerCode: NOT_CONNECTED_ERROR,
      createdAtMs: at,
      updatedAtMs: at,
    });
    return { ok: false, status: 409, error: NOT_CONNECTED_ERROR };
  }

  // Payout-fingerprint dedupe (anti-fraud Tier 3b): capture the destination's
  // opaque Stripe fingerprint, then refuse the withdrawal if too many distinct
  // platform accounts pay into the same real bank (a Sybil farm collapsing to a
  // single payout identity). Persist the fingerprint so sibling accounts see it.
  if (status.payoutFingerprint) {
    if (user.payoutFingerprint !== status.payoutFingerprint) {
      await users.setConnectAccount(developerId, {
        stripeConnectAccountId: user.stripeConnectAccountId,
        payoutsEnabled: status.payoutsEnabled,
        payoutFingerprint: status.payoutFingerprint,
      });
    }
    const shared = await users.countAccountsByPayoutFingerprint(
      status.payoutFingerprint,
    );
    if (shared >= SYBIL_PAYOUT_FINGERPRINT_THRESHOLD) {
      const at = nowMs(deps);
      await payoutAttempts.record({
        attemptId,
        developerId,
        status: "blocked",
        amountCents: availableCents(user),
        stripeConnectAccountId: user.stripeConnectAccountId,
        providerCode: SHARED_FINGERPRINT_REASON,
        createdAtMs: at,
        updatedAtMs: at,
      });
      return { ok: false, status: 409, error: PAYOUT_RISK_ERROR };
    }
  }

  // Payout-boundary risk gate (anti-fraud Tier 3c, prove-before-pay): even a
  // matured, eligible balance is refused if the developer is flagged (e.g. a
  // collusion cluster). Runs before any money moves; the gate itself fails open.
  if (deps.assessRisk) {
    const verdict = await deps.assessRisk(developerId);
    if (verdict.block) {
      const at = nowMs(deps);
      await payoutAttempts.record({
        attemptId,
        developerId,
        status: "blocked",
        amountCents: availableCents(user),
        stripeConnectAccountId: user.stripeConnectAccountId,
        providerCode: verdict.reason ?? PAYOUT_RISK_ERROR,
        createdAtMs: at,
        updatedAtMs: at,
      });
      return { ok: false, status: 409, error: PAYOUT_RISK_ERROR };
    }
  }

  // Mature any held earnings whose hold window has elapsed, then pay out only
  // the matured (available) balance — never the still-held, clawback-able
  // portion (anti-fraud Tier 3a).
  await users.matureHeldEarnings(developerId, nowMs(deps));
  const matured = (await users.getById(developerId)) ?? user;
  const amountCents = availableCents(matured);
  if (amountCents < MINIMUM_PAYOUT_CENTS) {
    const at = nowMs(deps);
    await payoutAttempts.record({
      attemptId,
      developerId,
      status: "blocked",
      amountCents,
      stripeConnectAccountId: user.stripeConnectAccountId,
      providerCode: BELOW_MINIMUM_ERROR,
      createdAtMs: at,
      updatedAtMs: at,
    });
    return { ok: false, status: 422, error: BELOW_MINIMUM_ERROR };
  }

  const createdAtMs = nowMs(deps);
  await payoutAttempts.record({
    attemptId,
    developerId,
    status: "pending",
    amountCents,
    stripeConnectAccountId: user.stripeConnectAccountId,
    createdAtMs,
    updatedAtMs: createdAtMs,
  });

  const reserved = await users.tryDebitBalanceCents(developerId, amountCents);
  if (!reserved) {
    await payoutAttempts.update(attemptId, {
      status: "blocked",
      providerCode: BALANCE_CHANGED_ERROR,
      updatedAtMs: nowMs(deps),
    });
    return { ok: false, status: 409, error: BALANCE_CHANGED_ERROR };
  }

  let result: Awaited<ReturnType<PayoutGateway["createPayout"]>>;
  try {
    result = await payouts.createPayout({
      accountId: user.stripeConnectAccountId,
      amountCents,
    });
  } catch (error) {
    await users.applyBalanceDeltaCents(developerId, amountCents);
    await payoutAttempts.update(attemptId, {
      status: "failed",
      ...providerFailureDetails(error),
      updatedAtMs: nowMs(deps),
    });
    throw error;
  }

  await payoutAttempts.update(attemptId, {
    status: "paid",
    providerEventId: result.payoutId,
    updatedAtMs: nowMs(deps),
  });

  return {
    ok: true,
    paidOutCents: result.amountCents,
    payoutId: result.payoutId,
  };
}
