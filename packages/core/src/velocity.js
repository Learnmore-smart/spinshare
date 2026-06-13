"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_LEDGER_SEQ_STATE = exports.SHADOW_BAN_TTL_SECONDS = exports.VELOCITY_THRESHOLD = exports.VELOCITY_WINDOW_TTL_SECONDS = exports.VELOCITY_WINDOW_SECONDS = void 0;
exports.windowStartEpochMin = windowStartEpochMin;
exports.windowStartEpochSec = windowStartEpochSec;
exports.isVelocityExceeded = isVelocityExceeded;
exports.reduceLedgerEvent = reduceLedgerEvent;
exports.reduceLedgerSequence = reduceLedgerSequence;
// ---------------------------------------------------------------------------
// Velocity window constants & helpers (Requirements 10.1, 10.2)
// ---------------------------------------------------------------------------
/** Length of the fixed velocity window, in seconds (Requirement 10.1). */
exports.VELOCITY_WINDOW_SECONDS = 60;
/**
 * TTL applied to the per-developer velocity counter key, in seconds. The
 * counter expires 60 seconds after its window begins, realizing the fixed
 * expiring window (Requirement 10.1).
 */
exports.VELOCITY_WINDOW_TTL_SECONDS = exports.VELOCITY_WINDOW_SECONDS;
/**
 * Maximum number of impressions a developer may record within a single 60s
 * window before being shadow-banned. The ban is triggered on the impression
 * whose post-increment count first exceeds this threshold — i.e. the 31st
 * impression (Requirement 10.2).
 */
exports.VELOCITY_THRESHOLD = 30;
/**
 * Time-to-live of the shadow-ban flag, in seconds (60 minutes). After this TTL
 * expires the developer is automatically restored (Requirement 10.6).
 */
exports.SHADOW_BAN_TTL_SECONDS = 3600;
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
function windowStartEpochMin(nowEpochSec) {
    return Math.floor(nowEpochSec / exports.VELOCITY_WINDOW_SECONDS);
}
/**
 * Start of the window that `nowEpochSec` falls into, expressed in epoch
 * seconds (always a multiple of {@link VELOCITY_WINDOW_SECONDS}).
 */
function windowStartEpochSec(nowEpochSec) {
    return windowStartEpochMin(nowEpochSec) * exports.VELOCITY_WINDOW_SECONDS;
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
function isVelocityExceeded(postIncrementCount) {
    return postIncrementCount > exports.VELOCITY_THRESHOLD;
}
/** A fresh, zeroed reducer state. */
exports.INITIAL_LEDGER_SEQ_STATE = Object.freeze({
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
function reduceLedgerEvent(state, event, splitFn) {
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
function reduceLedgerSequence(events, splitFn, initial = { ...exports.INITIAL_LEDGER_SEQ_STATE }) {
    return events.reduce((acc, event) => reduceLedgerEvent(acc, event, splitFn), initial);
}
//# sourceMappingURL=velocity.js.map