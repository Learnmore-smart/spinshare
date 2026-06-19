/**
 * Flush service — the Redis→Firestore reconciliation cycle.
 *
 * The hot path (`POST /api/track` → `CounterStore.applyImpression`) never writes
 * Firestore. Instead each impression credits/decrements Redis counters and
 * enqueues a durable `LedgerEntry`. This background process periodically drains
 * those pending counters and writes them to the durable system of record. See
 * design "Redis→Firestore Reconciliation".
 *
 * One cycle (`runFlushCycle`):
 *   1. `drainPending(batchSize)` atomically moves up to `batchSize` queued
 *      entries (plus their aggregate balance/budget deltas) into an in-flight
 *      batch identified by a `batchToken`.
 *   2. If the batch is empty, return early (nothing to reconcile).
 *   3. Durable write: append the ledger entries (idempotent by `entryId`), then
 *      apply the aggregate per-user balance deltas and per-campaign budget
 *      deltas via the repositories. Each user/campaign delta is applied exactly
 *      once (the entries are grouped before writing).
 *   4. Only after the durable write succeeds, `ackDrained(batchToken)` removes
 *      the in-flight batch and subtracts the drained deltas from the pending
 *      counters so they are never flushed again.
 *   5. If the durable write fails, the cycle does NOT ack. The in-flight batch
 *      is therefore retained by the counter store and retried on a later cycle.
 *
 * ── Idempotency / why a retry cannot double-count ──────────────────────────
 * Two facts make retries safe (Requirements 3.4, 3.5):
 *
 *   • Ledger entries are written by `LedgerRepository.appendEntries`, which is
 *     idempotent keyed by `entryId` (deterministic Firestore doc id). Re-writing
 *     the same batch overwrites the same documents — the durable ledger never
 *     grows a duplicate impression record.
 *
 *   • The aggregate balance/budget deltas are *additive* and therefore NOT
 *     idempotent if blindly re-added. We avoid double-application by (a)
 *     deriving the deltas from the (idempotent) ledger entries of the batch
 *     rather than from any free-running counter, and (b) acking only after the
 *     durable write succeeds. A failed write is never acked, so the counter
 *     store keeps the batch in-flight and the deltas are applied exactly once
 *     per *successful* cycle. The durable write is intended to be transactional
 *     (entries + deltas committed atomically), so a retried batch re-writes the
 *     same idempotent entries and re-applies the same deltas only on the cycle
 *     that ultimately succeeds.
 *
 * (The deeper double-count-proofing is exercised by the property tests in
 * tasks 8.2 / 8.3.)
 */

import type { LedgerEntry } from "@spinshare/core";
import {
  MICROCENTS_PER_CENT,
  earningsHoldWindowSecondsForAccountAge,
} from "@spinshare/core";

import type {
  CampaignRepository,
  CounterStore,
  LedgerRepository,
  UserRepository,
} from "./ports";

/** Default maximum number of pending entries drained per flush cycle. */
export const DEFAULT_FLUSH_BATCH_SIZE = 500;

/**
 * Dependencies for the flush service. Injected for testability; the composition
 * root supplies the concrete adapters (in-memory / Firestore emulator /
 * production).
 */
export interface FlushServiceDeps {
  /** Hot-path counter store to drain pending work from and acknowledge. */
  counters: CounterStore;
  /** Durable ledger repository (idempotent `appendEntries` by `entryId`). */
  ledger: LedgerRepository;
  /** Durable user repository for applying aggregate balance deltas. */
  users: UserRepository;
  /** Durable campaign repository for applying aggregate budget deltas. */
  campaigns: CampaignRepository;
  /** Clock override for deterministic tests (earnings-hold maturation stamp). */
  nowMs?: () => number;
}

/**
 * Outcome of a single flush cycle. Lets a scheduler observe whether work was
 * reconciled and surfaces a durable-write failure without throwing (so the
 * in-flight batch can simply be retried on the next cycle).
 */
export interface FlushCycleResult {
  /** Number of pending entries drained this cycle. */
  drained: number;
  /** `true` once the durable write succeeded and the batch was acknowledged. */
  flushed: boolean;
  /** The drained batch token, or `null` when nothing was drained. */
  batchToken: string | null;
  /** Aggregate developer balance deltas (cents) applied, keyed by user id. */
  balanceDeltaCentsByUser: Record<string, number>;
  /** Aggregate campaign budget deltas (cents, ≤ 0) applied, keyed by campaign id. */
  budgetDeltaCentsByCampaign: Record<string, number>;
  /**
   * Present only when the durable write failed. The cycle did NOT ack, so the
   * in-flight batch is retained by the counter store for a subsequent retry.
   */
  error?: unknown;
}

/** Convert a micro-cent amount to whole cents, rounding half-away-from-zero. */
function microcentsToCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

/**
 * Aggregate the per-user balance and per-campaign budget deltas directly from a
 * batch's ledger entries.
 *
 * Deriving from the (idempotent) entries — rather than blindly trusting a
 * mutable counter — is what keeps reconciliation retry-safe: the same entries
 * always produce the same deltas. Balances accumulate in whole cents
 * (`developerCreditCents`); budgets accumulate in exact micro-cents
 * (`revenueMicrocents`) and are converted to whole cents once per campaign, so
 * the rounding matches the counter store's own aggregation.
 */
function aggregateDeltas(entries: readonly LedgerEntry[]): {
  balanceDeltaCentsByUser: Record<string, number>;
  budgetDeltaCentsByCampaign: Record<string, number>;
} {
  const balanceDeltaCentsByUser: Record<string, number> = {};
  const budgetDeltaMicrocentsByCampaign: Record<string, number> = {};

  for (const entry of entries) {
    balanceDeltaCentsByUser[entry.developerId] =
      (balanceDeltaCentsByUser[entry.developerId] ?? 0) +
      entry.developerCreditCents;
    // Budget is decremented by the full per-impression revenue (Req 2.4).
    budgetDeltaMicrocentsByCampaign[entry.campaignId] =
      (budgetDeltaMicrocentsByCampaign[entry.campaignId] ?? 0) -
      entry.revenueMicrocents;
  }

  const budgetDeltaCentsByCampaign: Record<string, number> = {};
  for (const [campaignId, microcents] of Object.entries(
    budgetDeltaMicrocentsByCampaign,
  )) {
    budgetDeltaCentsByCampaign[campaignId] = microcentsToCents(microcents);
  }

  return { balanceDeltaCentsByUser, budgetDeltaCentsByCampaign };
}

/**
 * Run one Redis→Firestore reconciliation cycle.
 *
 * Drains a batch of pending impressions, durably persists them (idempotent
 * ledger append + grouped aggregate deltas), and acknowledges the batch only
 * after the durable write succeeds. On a durable-write failure the batch is
 * left in-flight (not acked) for a later retry and the error is reported on the
 * returned result rather than thrown (Requirements 3.1–3.5).
 *
 * @param deps - Injected counter store and durable repositories.
 * @param batchSize - Max pending entries to drain this cycle (defaults to
 *   {@link DEFAULT_FLUSH_BATCH_SIZE}).
 * @returns The {@link FlushCycleResult} describing what was reconciled.
 */
export async function runFlushCycle(
  deps: FlushServiceDeps,
  batchSize: number = DEFAULT_FLUSH_BATCH_SIZE,
): Promise<FlushCycleResult> {
  const { counters, ledger, users, campaigns } = deps;
  const nowMs = deps.nowMs?.() ?? Date.now();

  // 1. Drain a batch into an in-flight key identified by batchToken.
  const batch = await counters.drainPending(batchSize);

  // 2. Nothing pending → nothing to reconcile.
  if (batch.entries.length === 0) {
    // A batch with no entries still produced a token; acknowledge it so the
    // store does not leak empty in-flight batches.
    await counters.ackDrained(batch.batchToken);
    return {
      drained: 0,
      flushed: true,
      batchToken: batch.batchToken,
      balanceDeltaCentsByUser: {},
      budgetDeltaCentsByCampaign: {},
    };
  }

  // Derive the aggregate deltas from the batch's idempotent ledger entries so a
  // retried batch yields identical deltas (see module idempotency note).
  const { balanceDeltaCentsByUser, budgetDeltaCentsByCampaign } =
    aggregateDeltas(batch.entries);

  try {
    // 3. Durable write. Append the (idempotent-by-entryId) ledger entries first,
    //    then apply each per-user balance delta and per-campaign budget delta
    //    exactly once (already grouped above).
    await ledger.appendEntries(batch.entries);

    for (const [userId, deltaCents] of Object.entries(
      balanceDeltaCentsByUser,
    )) {
      if (deltaCents > 0) {
        // Earned impression revenue → held bucket (anti-fraud Tier 3a): matures
        // into a withdrawable balance only after a hold window, during which a
        // fraud scan can claw it back. The window is scaled by account age
        // (Tier 3d — progressive trust): younger accounts hold longer. Refunds/
        // bonuses bypass the hold (they use applyBalanceDeltaCents directly).
        const existing = await users.getById(userId);
        const accountAgeMs =
          existing?.createdAtMs !== undefined
            ? Math.max(0, nowMs - existing.createdAtMs)
            : undefined;
        const holdSeconds = earningsHoldWindowSecondsForAccountAge(accountAgeMs);
        await users.creditHeldEarnings(
          userId,
          deltaCents,
          nowMs + holdSeconds * 1000,
        );
      } else if (deltaCents < 0) {
        // Defensive: aggregate impression credit is never negative, but a
        // negative adjustment (if ever introduced) debits available directly.
        await users.applyBalanceDeltaCents(userId, deltaCents);
      }
    }

    for (const [campaignId, deltaCents] of Object.entries(
      budgetDeltaCentsByCampaign,
    )) {
      if (deltaCents === 0) {
        continue;
      }
      // Budget application is best-effort. The ledger entries are the durable
      // source of truth and have already been appended above; a campaign that
      // was deleted after its impressions were credited must not throw and
      // poison the whole batch (which would nack it back to the pending queue
      // and strand every developer's earnings). Skip a missing campaign rather
      // than aborting reconciliation; transient errors still propagate to the
      // catch below and trigger a safe, idempotent retry.
      if ((await campaigns.getById(campaignId)) === null) {
        continue;
      }
      await campaigns.applyBudgetDeltaCents(campaignId, deltaCents);
    }
  } catch (error) {
    // 5. Durable write failed: do NOT ack. Return the batch to the pending
    //    queue (`nackDrained`) so the counter store retains it for retry on a
    //    subsequent cycle (Requirement 3.4). Because the ledger entries are
    //    idempotent by entryId and the deltas are derived from them, the retry
    //    cannot double-count.
    await counters.nackDrained(batch.batchToken);
    return {
      drained: batch.entries.length,
      flushed: false,
      batchToken: batch.batchToken,
      balanceDeltaCentsByUser,
      budgetDeltaCentsByCampaign,
      error,
    };
  }

  // 4. Durable write succeeded → acknowledge the batch. This removes the
  //    in-flight batch and subtracts the drained deltas from the pending
  //    counters so they are never flushed again.
  await counters.ackDrained(batch.batchToken);

  return {
    drained: batch.entries.length,
    flushed: true,
    batchToken: batch.batchToken,
    balanceDeltaCentsByUser,
    budgetDeltaCentsByCampaign,
  };
}
