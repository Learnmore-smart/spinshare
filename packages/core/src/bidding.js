"use strict";
/**
 * Pure bidding selection for SpinShare.
 *
 * Single source of truth for choosing the winning campaign for `GET /api/ad`.
 * No I/O, no environment dependencies, fully deterministic: given the same
 * candidate set (in any order) the same winner is always selected.
 *
 * Selection rules (see design "Bidding Engine" and Requirement 1):
 *   1. Build the eligible set: every campaign with `budgetCents > 0` AND
 *      `cpmCents > 0` (Req 1.1).
 *   2. If no candidate is eligible, return `null` (Req 1.4 — no ad available).
 *   3. Otherwise select the highest `cpmCents` (Req 1.2, 1.6).
 *   4. Break CPM ties by earliest `createdAtMs` (Req 1.5).
 *   5. Break remaining ties by lowest `id` (Req 1.5) — a strict total order, so
 *      exactly one winner is always chosen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectWinner = selectWinner;
exports.isBetterBid = isBetterBid;
/**
 * Selects the single winning campaign from a candidate set.
 *
 * Filters to eligible campaigns (positive budget and positive CPM), then
 * reduces by {@link isBetterBid}. Returns `null` when no candidate is eligible.
 *
 * Deterministic and order-independent: the strict total order imposed by
 * {@link isBetterBid} guarantees the same winner regardless of input ordering.
 *
 * @param candidates - The campaigns to consider (any order).
 * @returns The winning campaign, or `null` if none are eligible.
 */
function selectWinner(candidates) {
    const eligible = candidates.filter((c) => c.budgetCents > 0 && c.cpmCents > 0);
    if (eligible.length === 0)
        return null;
    return eligible.reduce((best, c) => (isBetterBid(c, best) ? c : best));
}
/**
 * Strict total order over campaigns used to pick a winner.
 *
 * Returns `true` when candidate `c` should beat the current `best`:
 *   - higher `cpmCents` wins; otherwise
 *   - earlier `createdAtMs` wins; otherwise
 *   - lower lexicographic `id` wins.
 *
 * Because `id` is unique per campaign, this is a strict total order: for any two
 * distinct campaigns exactly one is "better", so ties always resolve to a single
 * deterministic winner.
 *
 * @param c - Candidate campaign being evaluated.
 * @param best - Current best campaign to compare against.
 * @returns `true` if `c` is a strictly better bid than `best`.
 */
function isBetterBid(c, best) {
    if (c.cpmCents !== best.cpmCents)
        return c.cpmCents > best.cpmCents;
    if (c.createdAtMs !== best.createdAtMs)
        return c.createdAtMs < best.createdAtMs;
    return c.id < best.id;
}
//# sourceMappingURL=bidding.js.map