/**
 * In-memory {@link CounterStore} — the local/test stand-in for the Redis hot
 * path.
 *
 * `applyImpression` performs the full impression mutation under a single
 * synchronous critical section (JavaScript's run-to-completion model gives us
 * that for free, mirroring the Redis Lua-script atomicity described in design
 * "Redis→Firestore Reconciliation"): credit the developer balance, decrement
 * the campaign budget by the full per-impression revenue, and enqueue a durable
 * `LedgerEntry` keyed by `entryId` for idempotency.
 *
 * Money convention (design "Money/Ledger Math"):
 *   - balances are accumulated in whole cents (`developerCreditCents`),
 *   - budget is decremented by the exact, sub-cent revenue, so it is tracked
 *     internally in micro-cents (1 cent = 1000 micro-cents) and converted to
 *     cents only at the port boundary.
 *
 * All balance/budget figures are *pending deltas since the last flush* — exactly
 * the Redis `bal:` / `bud:` counter semantics. Firestore holds the authoritative
 * totals; the flush process drains these deltas (`drainPending`) and, once the
 * durable write succeeds, acknowledges them (`ackDrained`) so they are not
 * flushed twice.
 */

import type { LedgerEntry } from "@spinshare/core";
import {
  MICROCENTS_PER_CENT,
  VELOCITY_WINDOW_SECONDS,
  dayWindowStartMs,
  hourWindowStartMs,
} from "@spinshare/core";
import type {
  ApplyImpressionInput,
  ApplyImpressionResult,
  CounterStore,
  PendingBatch,
} from "../../ports/counter-store";
import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./clock";

/** A single fixed-window velocity counter with its expiry. */
interface VelocityCounter {
  count: number;
  /** Epoch millis at which this window counter expires (TTL = 60s). */
  expiresAtMs: number;
}

/** A windowed earnings accumulator (hour or day) with its aligned window start. */
interface EarningWindow {
  /** Aligned window start (epoch millis); a different start resets the total. */
  windowStartMs: number;
  /** Credited earnings accumulated within the window, in whole cents. */
  cents: number;
}

/** An in-flight batch held between `drainPending` and `ackDrained`. */
interface InflightBatch {
  entries: LedgerEntry[];
  balanceDeltaCentsByUser: Record<string, number>;
  budgetDeltaMicrocentsByCampaign: Record<string, number>;
}

/** Convert a micro-cent amount to whole cents, rounding half-away-from-zero. */
function microcentsToCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

export class MemoryCounterStore implements CounterStore {
  /** Pending developer balance delta, in whole cents, keyed by user id. */
  private readonly balanceCentsByUser = new Map<string, number>();
  /** Pending campaign budget delta, in micro-cents (≤ 0), keyed by campaign id. */
  private readonly budgetMicrocentsByCampaign = new Map<string, number>();
  /** Queued ledger entries awaiting flush, keyed by `entryId` (insertion order). */
  private readonly pendingEntries = new Map<string, LedgerEntry>();
  /** Every `entryId` ever seen (pending, in-flight, or acked) for idempotency. */
  private readonly knownEntryIds = new Set<string>();
  /** Fixed 60s velocity windows keyed by `${userId}:${windowStartEpochSec}`. */
  private readonly velocity = new Map<string, VelocityCounter>();
  /** Per-developer credited earnings in the current aligned hour window. */
  private readonly earnHour = new Map<string, EarningWindow>();
  /** Per-developer credited earnings in the current UTC day window. */
  private readonly earnDay = new Map<string, EarningWindow>();
  /** Active shadow-bans: user id → epoch millis at which the ban expires. */
  private readonly shadowBans = new Map<string, number>();
  /** In-flight drained batches keyed by `batchToken`. */
  private readonly inflight = new Map<string, InflightBatch>();

  constructor(
    private readonly clock: Clock = new SystemClock(),
    private readonly ids: IdGenerator = new RandomIdGenerator(),
  ) {}

  // --- Hot path -----------------------------------------------------------

  async applyImpression(
    input: ApplyImpressionInput,
  ): Promise<ApplyImpressionResult> {
    const { developerId, campaignId, entryId, split } = input;

    // Idempotency: an already-seen entryId never moves money twice.
    if (this.knownEntryIds.has(entryId)) {
      return {
        applied: false,
        balanceCents: this.balanceCentsByUser.get(developerId) ?? 0,
        budgetCents: microcentsToCents(
          this.budgetMicrocentsByCampaign.get(campaignId) ?? 0,
        ),
        entryId,
      };
    }

    // Single synchronous critical section (no awaits between reads & writes).
    const nextBalance =
      (this.balanceCentsByUser.get(developerId) ?? 0) +
      split.developerCreditCents;
    const nextBudgetMicrocents =
      (this.budgetMicrocentsByCampaign.get(campaignId) ?? 0) -
      split.revenueMicrocents;

    this.balanceCentsByUser.set(developerId, nextBalance);
    this.budgetMicrocentsByCampaign.set(campaignId, nextBudgetMicrocents);

    const entry: LedgerEntry = {
      entryId,
      campaignId,
      developerId,
      revenueMicrocents: split.revenueMicrocents,
      developerCreditCents: split.developerCreditCents,
      spinshareRetentionMicrocents: split.spinshareRetentionMicrocents,
    };
    this.pendingEntries.set(entryId, entry);
    this.knownEntryIds.add(entryId);

    return {
      applied: true,
      balanceCents: nextBalance,
      budgetCents: microcentsToCents(nextBudgetMicrocents),
      entryId,
    };
  }

  async getBalanceCents(userId: string): Promise<number> {
    return this.balanceCentsByUser.get(userId) ?? 0;
  }

  async getBudgetCents(campaignId: string): Promise<number> {
    return microcentsToCents(
      this.budgetMicrocentsByCampaign.get(campaignId) ?? 0,
    );
  }

  // --- Velocity + shadow-ban ---------------------------------------------

  async incrementVelocity(
    userId: string,
    windowStartEpochSec: number,
  ): Promise<number> {
    const key = `${userId}:${windowStartEpochSec}`;
    const nowMs = this.clock.nowMs();
    this.pruneExpiredVelocity(nowMs);

    const existing = this.velocity.get(key);
    if (existing && existing.expiresAtMs > nowMs) {
      existing.count += 1;
      return existing.count;
    }

    // Fresh window: the counter expires 60s after the window start.
    const expiresAtMs =
      (windowStartEpochSec + VELOCITY_WINDOW_SECONDS) * 1000;
    this.velocity.set(key, { count: 1, expiresAtMs });
    return 1;
  }

  async isShadowBanned(userId: string): Promise<boolean> {
    const expiresAtMs = this.shadowBans.get(userId);
    if (expiresAtMs === undefined) return false;
    if (this.clock.nowMs() >= expiresAtMs) {
      // TTL elapsed → automatic restore.
      this.shadowBans.delete(userId);
      return false;
    }
    return true;
  }

  async setShadowBan(userId: string, ttlSeconds: number): Promise<void> {
    this.shadowBans.set(userId, this.clock.nowMs() + ttlSeconds * 1000);
  }

  private pruneExpiredVelocity(nowMs: number): void {
    for (const [key, counter] of this.velocity) {
      if (counter.expiresAtMs <= nowMs) this.velocity.delete(key);
    }
  }

  // --- Earning caps -------------------------------------------------------

  async getEarnedCentsInWindows(
    userId: string,
    nowMs: number,
  ): Promise<{ hourlyCents: number; dailyCents: number }> {
    const hour = this.earnHour.get(userId);
    const day = this.earnDay.get(userId);
    const hourlyCents =
      hour && hour.windowStartMs === hourWindowStartMs(nowMs) ? hour.cents : 0;
    const dailyCents =
      day && day.windowStartMs === dayWindowStartMs(nowMs) ? day.cents : 0;
    return { hourlyCents, dailyCents };
  }

  async addEarnedCents(
    userId: string,
    amountCents: number,
    nowMs: number,
  ): Promise<void> {
    const hourStart = hourWindowStartMs(nowMs);
    const hour = this.earnHour.get(userId);
    if (hour && hour.windowStartMs === hourStart) {
      hour.cents += amountCents;
    } else {
      this.earnHour.set(userId, { windowStartMs: hourStart, cents: amountCents });
    }

    const dayStart = dayWindowStartMs(nowMs);
    const day = this.earnDay.get(userId);
    if (day && day.windowStartMs === dayStart) {
      day.cents += amountCents;
    } else {
      this.earnDay.set(userId, { windowStartMs: dayStart, cents: amountCents });
    }
  }

  // --- Reconciliation support --------------------------------------------

  async drainPending(maxEntries: number): Promise<PendingBatch> {
    const batchToken = this.ids.next("batch");
    const entries: LedgerEntry[] = [];
    const balanceDeltaCentsByUser: Record<string, number> = {};
    const budgetDeltaMicrocentsByCampaign: Record<string, number> = {};

    for (const [entryId, entry] of this.pendingEntries) {
      if (entries.length >= maxEntries) break;
      entries.push(entry);
      this.pendingEntries.delete(entryId);

      balanceDeltaCentsByUser[entry.developerId] =
        (balanceDeltaCentsByUser[entry.developerId] ?? 0) +
        entry.developerCreditCents;
      budgetDeltaMicrocentsByCampaign[entry.campaignId] =
        (budgetDeltaMicrocentsByCampaign[entry.campaignId] ?? 0) -
        entry.revenueMicrocents;
    }

    this.inflight.set(batchToken, {
      entries,
      balanceDeltaCentsByUser,
      budgetDeltaMicrocentsByCampaign,
    });

    const budgetDeltaCentsByCampaign: Record<string, number> = {};
    for (const [campaignId, microcents] of Object.entries(
      budgetDeltaMicrocentsByCampaign,
    )) {
      budgetDeltaCentsByCampaign[campaignId] = microcentsToCents(microcents);
    }

    return {
      batchToken,
      entries,
      balanceDeltaCentsByUser,
      budgetDeltaCentsByCampaign,
    };
  }

  async ackDrained(batchToken: string): Promise<void> {
    const batch = this.inflight.get(batchToken);
    if (!batch) return; // idempotent: unknown / already-acked token is a no-op.

    // Durable write succeeded → subtract the drained deltas from the pending
    // counters so they are never flushed again.
    for (const [userId, deltaCents] of Object.entries(
      batch.balanceDeltaCentsByUser,
    )) {
      const remaining = (this.balanceCentsByUser.get(userId) ?? 0) - deltaCents;
      if (remaining === 0) this.balanceCentsByUser.delete(userId);
      else this.balanceCentsByUser.set(userId, remaining);
    }
    for (const [campaignId, deltaMicrocents] of Object.entries(
      batch.budgetDeltaMicrocentsByCampaign,
    )) {
      const remaining =
        (this.budgetMicrocentsByCampaign.get(campaignId) ?? 0) - deltaMicrocents;
      if (remaining === 0) this.budgetMicrocentsByCampaign.delete(campaignId);
      else this.budgetMicrocentsByCampaign.set(campaignId, remaining);
    }

    this.inflight.delete(batchToken);
  }

  async nackDrained(batchToken: string): Promise<void> {
    const batch = this.inflight.get(batchToken);
    if (!batch) return; // idempotent: unknown / already-acked token is a no-op.

    // Durable write failed → return the drained entries to the pending queue so
    // the next flush cycle retries them (Requirement 3.4). The pending
    // balance/budget counters were never touched by drainPending (they are only
    // decremented on ack), so re-surfacing the entries fully restores the batch.
    // Re-insert at the front so retried entries are drained before newer ones,
    // preserving overall FIFO ordering.
    const requeued = new Map<string, LedgerEntry>();
    for (const entry of batch.entries) {
      requeued.set(entry.entryId, entry);
    }
    for (const [entryId, entry] of this.pendingEntries) {
      requeued.set(entryId, entry);
    }
    this.pendingEntries.clear();
    for (const [entryId, entry] of requeued) {
      this.pendingEntries.set(entryId, entry);
    }

    this.inflight.delete(batchToken);
  }
}