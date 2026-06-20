/**
 * UserRepository port — durable user storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `users/{userId}` collection. See design "Data Models".
 */

import type { AuthProviderId, User, UserRole } from "@spinshare/core";

/**
 * An identity resolved from an external OAuth provider (Google/GitHub), used to
 * create or update the corresponding `User` on first sign-in. `providerAccountId`
 * is the provider's stable account identifier.
 */
export interface ExternalIdentity {
  /** Identity source. */
  provider: AuthProviderId;
  /** Stable provider-side account id. */
  providerAccountId: string;
  /** Email from the identity provider. */
  email: string;
  /** Proof that the provider verified ownership of `email`. */
  emailVerified: true;
  /** Role to assign on first creation; defaults applied by the adapter. */
  role?: UserRole;
}

/** Durable user repository. */
export interface UserRepository {
  /** Loads a user by id, or `null` if it does not exist. */
  getById(id: string): Promise<User | null>;
  /** Creates or updates a user from an external identity, returning the user. */
  upsertFromIdentity(identity: ExternalIdentity): Promise<User>;
  /**
   * Applies a signed balance delta directly to the **available** (spendable)
   * balance — used for instant, non-held credits (signup bonus) and payout
   * refunds. Does not touch the held bucket. Earned impression revenue is
   * credited via {@link creditHeldEarnings} instead so it passes through the
   * anti-fraud hold. Upserts a missing record (flush/signup may run before the
   * durable user exists).
   */
  applyBalanceDeltaCents(id: string, deltaCents: number): Promise<void>;
  /**
   * Credits earned impression revenue into the **held** bucket (anti-fraud
   * Tier 3a): increments both `balanceCents` (total) and `heldCents`, recording
   * a lot that matures at `maturesAtMs`. Held earnings are not withdrawable
   * until matured and can be clawed back by {@link voidHeldEarnings} until then.
   * Upserts a missing record like {@link applyBalanceDeltaCents}.
   */
  creditHeldEarnings(
    id: string,
    cents: number,
    maturesAtMs: number,
  ): Promise<void>;
  /**
   * Matures held lots whose `maturesAtMs <= nowMs` into the available balance
   * (decrements `heldCents`, leaves `balanceCents` unchanged, drops the lots).
   * Returns the total cents matured. No-op for a missing/legacy user.
   */
  matureHeldEarnings(id: string, nowMs: number): Promise<number>;
  /**
   * Clawback: voids still-held lots whose `maturesAtMs > nowMs` (not yet
   * matured), decrementing both `heldCents` and `balanceCents`. Matured earnings
   * — which already survived the hold window — are NOT touched. Returns the
   * total cents voided. No-op for a missing/legacy user.
   */
  voidHeldEarnings(id: string, nowMs: number): Promise<number>;
  /**
   * Atomically reserves a payout amount by debiting only when the user exists
   * and the current **available** balance (`balanceCents - heldCents`) is at
   * least `amountCents`. Debits `balanceCents`; never touches held lots.
   */
  tryDebitBalanceCents(id: string, amountCents: number): Promise<boolean>;
  /**
   * Persists the developer's Stripe Connect account id and current payout
   * eligibility (set during payout onboarding and refreshed from Stripe).
   * Optionally records the opaque payout `payoutFingerprint` once known
   * (anti-fraud Tier 3b). Returns the updated user, or throws if absent.
   */
  setConnectAccount(
    id: string,
    input: {
      stripeConnectAccountId: string;
      payoutsEnabled: boolean;
      payoutFingerprint?: string;
    },
  ): Promise<User>;
  /**
   * Counts distinct user records whose `payoutFingerprint` equals `fingerprint`
   * (anti-fraud Tier 3b). Several accounts sharing one fingerprint = a Sybil
   * farm collapsing to a single real payout identity.
   */
  countAccountsByPayoutFingerprint(fingerprint: string): Promise<number>;
  /** Lists every durable user record (internal analytics only). */
  listAll(): Promise<User[]>;
}
