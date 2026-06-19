/**
 * One-time $1 developer sign-up bonus.
 *
 * Idempotent by deterministic ledger `entryId` (`signup_bonus:{developerId}`) and
 * by checking for an existing `type: "signup_bonus"` row. On first grant, writes
 * the durable ledger entry and credits `users/{id}.balanceCents` immediately so
 * payout eligibility reflects the bonus without waiting for impression flush.
 */

import {
  SIGNUP_BONUS_CENTS,
  SIGNUP_BONUS_DESCRIPTION,
  signupBonusEntryId,
  type LedgerEntry,
} from "@spinshare/core";

import type { LedgerRepository, UserRepository } from "./ports";

export interface SignupBonusServiceDeps {
  ledger: LedgerRepository;
  users: UserRepository;
}

export type GrantSignupBonusResult =
  | { granted: true }
  | { granted: false; reason: "already_granted" };

export function buildSignupBonusEntry(
  developerId: string,
  createdAtMs = Date.now(),
): LedgerEntry {
  return {
    entryId: signupBonusEntryId(developerId),
    type: "signup_bonus",
    campaignId: "",
    developerId,
    revenueMicrocents: 0,
    developerCreditCents: SIGNUP_BONUS_CENTS,
    spinshareRetentionMicrocents: 0,
    creditCents: SIGNUP_BONUS_CENTS,
    description: SIGNUP_BONUS_DESCRIPTION,
    createdAtMs,
  };
}

function entryIsSignupBonus(entry: LedgerEntry): boolean {
  return entry.type === "signup_bonus" || entry.entryId.startsWith("signup_bonus:");
}

/**
 * Grants the one-time signup bonus when the developer has not received it yet.
 * Safe to call on every sign-in / dashboard load.
 */
export async function grantSignupBonus(
  deps: SignupBonusServiceDeps,
  developerId: string,
): Promise<GrantSignupBonusResult> {
  const entryId = signupBonusEntryId(developerId);
  const existingById = await deps.ledger.getByEntryId(entryId);
  if (existingById) {
    return { granted: false, reason: "already_granted" };
  }

  const existingRows = await deps.ledger.listByDeveloper(developerId);
  if (existingRows.some(entryIsSignupBonus)) {
    return { granted: false, reason: "already_granted" };
  }

  const inserted = await deps.ledger.appendEntryIfAbsent(
    buildSignupBonusEntry(developerId),
  );
  if (!inserted) {
    return { granted: false, reason: "already_granted" };
  }

  await deps.users.applyBalanceDeltaCents(developerId, SIGNUP_BONUS_CENTS);
  return { granted: true };
}
