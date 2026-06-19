/**
 * Velocity rate-limiting / shadow-ban window helpers and a pure budget/balance
 * conservation reducer for SpinShare.
 *
 * This module is pure (no I/O, no environment, no clock). Time is passed in as
 * epoch seconds and all monetary state is kept in integers (micro-cents for
 * budget/revenue, whole cents for the developer balance) so totals are exact
 * and conserved — never floats.
 *
 * Design references:
 *   - "Velocity Rate-Limiting & Shadow-Ban" (fixed 60s window keyed by
 *     floor(nowEpochSec / 60); shadow-ban triggers on the 31st impression in a
 *     window and carries a 60-minute TTL).
 *   - "Money/Ledger Math" (per-impression revenue in micro-cents == cpmCents;
 *     budget decremented by the full revenue; retention by subtraction).
 *
 * Requirements: 10.1, 10.2 (velocity window + shadow-ban trigger), 2.4
 * (budget decremented by the full per-impression revenue), 2.8 (impressions on
 * a non-positive budget are rejected and move no money).
 */

import type { Split } from "./types";

// ---------------------------------------------------------------------------
// Velocity window constants & helpers (Requirements 10.1, 10.2)
// ---------------------------------------------------------------------------

/** Length of the fixed velocity window, in seconds (Requirement 10.1). */
export const VELOCITY_WINDOW_SECONDS = 60;

/**
 * TTL applied to the per-developer velocity counter key, in seconds. The
 * counter expires 60 seconds after its window begins, realizing the fixed
 * expiring window (Requirement 10.1).
 */
export const VELOCITY_WINDOW_TTL_SECONDS = VELOCITY_WINDOW_SECONDS;

/**
 * Maximum number of impressions a developer may record within a single 60s
 * window before being shadow-banned. The ban is triggered on the impression
 * whose post-increment count first exceeds this threshold — i.e. the 31st
 * impression (Requirement 10.2).
 */
export const VELOCITY_THRESHOLD = 30;

/**
 * Time-to-live of the shadow-ban flag, in seconds (60 minutes). After this TTL
 * expires the developer is automatically restored (Requirement 10.6).
 */
export const SHADOW_BAN_TTL_SECONDS = 3600;

// ---------------------------------------------------------------------------
// Network-level signals (anti-fraud Tier 2: cross the per-userId silo)
// ---------------------------------------------------------------------------

/** Fixed window for per-IP impression velocity, in seconds. */
export const IP_VELOCITY_WINDOW_SECONDS = 60;

/**
 * Window over which distinct earning accounts on one IP are counted, in seconds
 * (one UTC day). Many accounts behind a single IP within this window is a
 * classic account-farm signal.
 */
export const IP_FANOUT_WINDOW_SECONDS = 86_400;

/**
 * Distinct developer ids on one IP (within {@link IP_FANOUT_WINDOW_SECONDS})
 * at/above which the IP looks like a farm. A *score feeder*, never a standalone
 * ban — shared NAT/CGNAT/VPN egress legitimately carries several users.
 */
export const IP_FANOUT_THRESHOLD = 3;

/**
 * Start of the day-aligned fan-out window that `nowEpochSec` falls into, in
 * epoch seconds (a multiple of {@link IP_FANOUT_WINDOW_SECONDS}).
 */
export function ipFanoutWindowStartEpochSec(nowEpochSec: number): number {
  return Math.floor(nowEpochSec / IP_FANOUT_WINDOW_SECONDS) * IP_FANOUT_WINDOW_SECONDS;
}

// ---------------------------------------------------------------------------
// Earnings hold / maturation (anti-fraud Tier 3a)
// ---------------------------------------------------------------------------

/**
 * How long freshly-credited developer earnings are *held* before they mature
 * into a withdrawable balance, in seconds (3 days).
 *
 * The load-bearing invariant: this window MUST be strictly longer than the
 * cross-entity fraud-scan interval (`/api/internal/fraud-scan`, which inspects
 * the last {@link IP_FANOUT_WINDOW_SECONDS} of activity). Held earnings can be
 * voided (clawed back) up until they mature; if the scan ran *less* often than
 * the hold, a farm could mature and withdraw before any scan flagged it. With a
 * 3-day hold and an (at least) daily scan, every earning is inspected at least
 * twice while still clawback-able. Lowering this below the scan interval
 * reopens the free-Sybil hole the hold exists to close.
 */
export const EARNINGS_HOLD_WINDOW_SECONDS = 3 * IP_FANOUT_WINDOW_SECONDS;

/**
 * Hold window for earnings credited to a *young* account (anti-fraud Tier 3d —
 * progressive trust), in seconds (7 days). Fresh accounts are the cheap Sybil
 * unit, so their earnings season longer before becoming withdrawable — giving
 * the fraud scan more passes to catch a farm. Legitimate new developers are
 * still paid in full, just later. Must also stay > the scan interval.
 */
export const NEW_ACCOUNT_HOLD_WINDOW_SECONDS = 7 * IP_FANOUT_WINDOW_SECONDS;

/**
 * Account age (seconds) below which an account is treated as "new" for the
 * progressive-trust hold (7 days). At/above it, the standard
 * {@link EARNINGS_HOLD_WINDOW_SECONDS} applies.
 */
export const NEW_ACCOUNT_AGE_THRESHOLD_SECONDS = 7 * 86_400;

/**
 * Hold window (seconds) for a credit, scaled by account age (Tier 3d). Younger
 * than {@link NEW_ACCOUNT_AGE_THRESHOLD_SECONDS} ⇒ the longer
 * {@link NEW_ACCOUNT_HOLD_WINDOW_SECONDS}; otherwise the standard hold. Unknown
 * age (`undefined` — legacy records predating age tracking) is treated as
 * established (standard hold), so legacy developers are never penalised.
 */
export function earningsHoldWindowSecondsForAccountAge(
  accountAgeMs?: number,
): number {
  if (
    accountAgeMs !== undefined &&
    accountAgeMs < NEW_ACCOUNT_AGE_THRESHOLD_SECONDS * 1000
  ) {
    return NEW_ACCOUNT_HOLD_WINDOW_SECONDS;
  }
  return EARNINGS_HOLD_WINDOW_SECONDS;
}

/** Coalescing bucket for held lots, in millis (1 hour). */
export const HELD_LOT_BUCKET_MS = 3_600_000;

/**
 * Rounds a maturation time up to the next {@link HELD_LOT_BUCKET_MS} boundary so
 * many small credits within an hour collapse into one held lot. Bounds the
 * per-user lot array to roughly `EARNINGS_HOLD_WINDOW_SECONDS / 3600` entries
 * (~72 for a 3-day hold) regardless of credit frequency. Rounding *up* only ever
 * delays maturation slightly — it never makes earnings withdrawable early.
 */
export function heldLotBucketMs(maturesAtMs: number): number {
  return Math.ceil(maturesAtMs / HELD_LOT_BUCKET_MS) * HELD_LOT_BUCKET_MS;
}

/**
 * Distinct platform accounts sharing one payout fingerprint (Stripe
 * `external_account.fingerprint`) at/above which a withdrawal is blocked for
 * review (anti-fraud Tier 3b). Two accounts paying into the same real bank is
 * the dispositive Sybil signal — a farm collapsing to a single payout identity
 * — so the threshold is tight (2). This is a *payout-boundary* control (blocks
 * money leaving, never destroys earnings), so a rare legitimate collision
 * (e.g. shared household account) is recoverable via review.
 */
export const SYBIL_PAYOUT_FINGERPRINT_THRESHOLD = 2;

/**
 * Index of the fixed 60-second velocity window that `nowEpochSec` falls into.
 *
 * `windowStartEpochMin(nowEpochSec) === floor(nowEpochSec / 60)`. This integer
 * is the `{windowEpochMin}` component of the Redis velocity key
 * `vel:{userId}:{windowEpochMin}` (Requirement 10.1).
 *
 * @param nowEpochSec current time as whole epoch seconds.
 * @returns the zero-based window index (whole minutes since the epoch).
 */
export function windowStartEpochMin(nowEpochSec: number): number {
  return Math.floor(nowEpochSec / VELOCITY_WINDOW_SECONDS);
}

/**
 * Start of the window that `nowEpochSec` falls into, expressed in epoch
 * seconds (always a multiple of {@link VELOCITY_WINDOW_SECONDS}).
 */
export function windowStartEpochSec(nowEpochSec: number): number {
  return windowStartEpochMin(nowEpochSec) * VELOCITY_WINDOW_SECONDS;
}

/**
 * Whether a developer should be shadow-banned given the post-increment count of
 * impressions recorded in the current window.
 *
 * Banning triggers when the count first *exceeds* {@link VELOCITY_THRESHOLD},
 * i.e. on the 31st impression and beyond (Requirement 10.2).
 *
 * @param postIncrementCount the window counter value *after* incrementing for
 *   the current impression.
 */
export function isVelocityExceeded(postIncrementCount: number): boolean {
  return postIncrementCount > VELOCITY_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Pure budget / balance conservation reducer (Requirements 2.4, 2.8)
// ---------------------------------------------------------------------------

/**
 * A function that computes the developer/platform revenue split for a given CPM
 * (in integer cents). In practice this is `computeSplit` from `./money`; it is
 * injected here so this module stays free of any dependency on the money
 * implementation (and so callers can supply a deterministic split in tests).
 */
export type SplitFn = (cpmCents: number) => Split;

/**
 * A single event in a campaign's money sequence.
 *
 * - `fund` adds `amountMicrocents` to the remaining budget (e.g. a confirmed
 *   Stripe payment, expressed in micro-cents for exactness).
 * - `impression` attempts to record one impression at the given `cpmCents`. If
 *   `shadowBanned` is true the impression returns success but moves no money
 *   (Requirements 10.4, 10.5).
 */
export type LedgerSeqEvent =
  | { type: "fund"; amountMicrocents: number }
  | { type: "impression"; cpmCents: number; shadowBanned?: boolean };

/**
 * Accumulated state of a campaign's money sequence. All values are integers.
 *
 * Invariants maintained by {@link reduceLedgerEvent} (Requirement 2.4):
 *   - `budgetMicrocents` === total funded − Σ(revenue of recorded impressions)
 *   - `balanceCents`     === Σ(developerCreditCents of recorded impressions)
 *   - `balanceCents >= 0` always (credits are non-negative).
 */
export interface LedgerSeqState {
  /** Remaining campaign budget, in micro-cents. */
  budgetMicrocents: number;
  /** Accumulated developer balance, in whole cents. */
  balanceCents: number;
  /** Number of impressions credited (non-banned, sufficient budget). */
  recordedCount: number;
  /** Number of impressions rejected for non-positive budget (Requirement 2.8). */
  rejectedCount: number;
  /** Number of impressions accepted while shadow-banned (no money moved). */
  shadowBannedCount: number;
}

/** A fresh, zeroed reducer state. */
export const INITIAL_LEDGER_SEQ_STATE: Readonly<LedgerSeqState> = Object.freeze({
  budgetMicrocents: 0,
  balanceCents: 0,
  recordedCount: 0,
  rejectedCount: 0,
  shadowBannedCount: 0,
});

/**
 * Apply a single ledger event to a state, returning a new state (the input is
 * never mutated). Pure and deterministic.
 *
 * Behavior:
 *   - `fund`: `budgetMicrocents += amountMicrocents`.
 *   - `impression` while shadow-banned: success, but no balance credit and no
 *     budget decrement (Requirements 10.4, 10.5); `shadowBannedCount++`.
 *   - `impression` on a non-positive budget: rejected, no mutation
 *     (Requirement 2.8); `rejectedCount++`.
 *   - `impression` otherwise: budget is decremented by the *full*
 *     per-impression revenue and the developer credit is added to the balance
 *     (Requirements 2.4, 2.2); `recordedCount++`.
 *
 * @param state the current accumulated state.
 * @param event the event to apply.
 * @param splitFn computes the split for a CPM (inject `computeSplit`).
 */
export function reduceLedgerEvent(
  state: LedgerSeqState,
  event: LedgerSeqEvent,
  splitFn: SplitFn,
): LedgerSeqState {
  if (event.type === "fund") {
    return { ...state, budgetMicrocents: state.budgetMicrocents + event.amountMicrocents };
  }

  // event.type === "impression"
  if (event.shadowBanned === true) {
    // Indistinguishable success, but no money moves (Requirements 10.4, 10.5).
    return { ...state, shadowBannedCount: state.shadowBannedCount + 1 };
  }

  if (state.budgetMicrocents <= 0) {
    // Non-positive budget: reject, mutate nothing (Requirement 2.8).
    return { ...state, rejectedCount: state.rejectedCount + 1 };
  }

  const split = splitFn(event.cpmCents);
  return {
    ...state,
    // Decrement by the full per-impression revenue (Requirement 2.4).
    budgetMicrocents: state.budgetMicrocents - split.revenueMicrocents,
    // Credit the developer their rounded share (Requirement 2.2).
    balanceCents: state.balanceCents + split.developerCreditCents,
    recordedCount: state.recordedCount + 1,
  };
}

/**
 * Fold a sequence of ledger events into a single conserved state. Pure: neither
 * the events nor `initial` are mutated.
 *
 * Conservation guarantees over the returned state (Requirements 2.4, 2.8):
 *   - `budgetMicrocents` === (initial budget + Σ funded) − Σ(recorded revenue)
 *   - `balanceCents`     === Σ(recorded developer credits), and is never negative
 *
 * @param events the ordered sequence to apply.
 * @param splitFn computes the split for a CPM (inject `computeSplit`).
 * @param initial optional starting state (defaults to a zeroed state).
 */
export function reduceLedgerSequence(
  events: readonly LedgerSeqEvent[],
  splitFn: SplitFn,
  initial: LedgerSeqState = { ...INITIAL_LEDGER_SEQ_STATE },
): LedgerSeqState {
  return events.reduce((acc, event) => reduceLedgerEvent(acc, event, splitFn), initial);
}

// ---------------------------------------------------------------------------
// Earning-cap windows (server-enforced anti-abuse, Requirements 10.x)
// ---------------------------------------------------------------------------

/** Milliseconds in one hour — the rolling hourly earning window length. */
export const HOUR_MS = 3_600_000;

/** Milliseconds in one UTC calendar day — the daily earning window length. */
export const DAY_MS = 86_400_000;

/**
 * Start (epoch millis) of the fixed, hour-aligned window that `nowMs` falls
 * into. Used to bucket credited developer earnings for the hourly cap. A fixed
 * aligned hour is a deterministic, store-friendly approximation of a strict
 * 60-minute rolling window; it bounds earnings to at most the cap per clock
 * hour, which is what the anti-abuse policy requires.
 */
export function hourWindowStartMs(nowMs: number): number {
  return Math.floor(nowMs / HOUR_MS) * HOUR_MS;
}

/**
 * Start (epoch millis) of the UTC calendar day that `nowMs` falls into. Epoch
 * millis are UTC-aligned, so flooring by {@link DAY_MS} yields UTC midnight —
 * matching the dashboard's "Today (UTC)" daily figure.
 */
export function dayWindowStartMs(nowMs: number): number {
  return Math.floor(nowMs / DAY_MS) * DAY_MS;
}

/**
 * Whether crediting `creditCents` would push a developer past either earning
 * cap, given the amounts they have already earned in the current hour/day
 * windows. Pure: the caller supplies the current window totals and the limits.
 *
 * Returns `true` when the impression must be suppressed (credited later, not
 * now) so that neither cap is exceeded.
 *
 * @param current  Already-credited cents in the current hour and day windows.
 * @param creditCents  The developer credit the pending impression would add.
 * @param limits  The hourly and daily caps in integer cents.
 */
export function wouldExceedEarningCap(
  current: { hourlyCents: number; dailyCents: number },
  creditCents: number,
  limits: { hourlyLimitCents: number; dailyLimitCents: number },
): boolean {
  return (
    current.hourlyCents + creditCents > limits.hourlyLimitCents ||
    current.dailyCents + creditCents > limits.dailyLimitCents
  );
}
