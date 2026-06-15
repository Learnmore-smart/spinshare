/**
 * Firebase Realtime Database (RTDB) {@link CounterStore} — the production hot
 * path. Google-native replacement for the former Redis/Upstash adapter.
 *
 * Why RTDB: it lives inside the same Firebase project as Firestore, has a large
 * free tier ($0 at this scale), and is purpose-built for ultra-fast, atomic
 * counting/caching. All hot-path state lives under a configurable root (default
 * `spinshare/hot`):
 *
 *   bal/{userId}                 pending developer balance delta (whole cents)
 *   bud/{campaignId}             pending campaign budget delta (micro-cents, ≤ 0)
 *   pending/ledger/{entryId}     { entry: LedgerEntry, enqueuedAt }  durable queue
 *   inflight/{batchToken}        { entries, meta }  drained but not yet acked
 *   velocity/{userId}/{windowStartSec}  fixed 60s window count
 *   shadowban/{userId}           epoch millis the ban expires
 *   earnHour/{userId}            { windowStartMs, cents }  credited earnings this hour
 *   earnDay/{userId}             { windowStartMs, cents }  credited earnings this UTC day
 *
 * ── Atomicity / idempotency (design "Redis→Firestore Reconciliation") ───────
 * `applyImpression`:
 *   1. A single-path RTDB *transaction* on `pending/ledger/{entryId}` writes the
 *      queued entry only when absent. A non-null current value aborts → the
 *      impression is a duplicate and no money moves. Keying the transaction on
 *      the entry id keeps concurrency high (two impressions only conflict when
 *      they share an `entryId`, i.e. the duplicate case we want to reject).
 *   2. On a fresh write, an atomic multi-path `update()` bumps the fast
 *      `bal`/`bud` counters with `ServerValue.increment`.
 * The authoritative per-impression record is the queued ledger entry. The
 * `bal`/`bud` counters are a fast-read denormalization; the flush service
 * re-derives durable deltas from the entries themselves, so a momentarily stale
 * counter (e.g. a crash between steps 1 and 2) can never cause a double-count.
 *
 * Money convention mirrors `MemoryCounterStore`: balances accumulate in whole
 * cents (`developerCreditCents`); budgets accumulate in exact micro-cents
 * (1 cent = 1000 micro-cents) and convert to cents only at the port boundary.
 */

import type { LedgerEntry } from "@spinshare/core";
import {
  MICROCENTS_PER_CENT,
  dayWindowStartMs,
  hourWindowStartMs,
} from "@spinshare/core";
import {
  ServerValue,
  type Database,
  type Reference,
} from "firebase-admin/database";

import type {
  ApplyImpressionInput,
  ApplyImpressionResult,
  CampaignTelemetry,
  CampaignTelemetryMetric,
  CounterStore,
  PendingBatch,
} from "../../ports/counter-store";
import {
  CAMPAIGN_TELEMETRY_METRICS,
  zeroCampaignTelemetry,
} from "../../ports/counter-store";
import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "../memory/clock";
import { getRealtimeDb } from "./client";

/** Default RTDB sub-tree that holds all hot-path counters. */
const DEFAULT_ROOT_PATH = "spinshare/hot";

/** Shape of a queued ledger node persisted under `pending/ledger/{entryId}`. */
interface PendingNode {
  entry: LedgerEntry;
  /** Enqueue time (epoch millis) used to drain in FIFO order. */
  enqueuedAt: number;
}

/** Aggregate deltas recorded with an in-flight batch so `ackDrained` can undo them. */
interface BatchMeta {
  balanceDeltaCentsByUser: Record<string, number>;
  /** Negative micro-cent deltas (sum of `-revenueMicrocents`) keyed by campaign. */
  budgetDeltaMicrocentsByCampaign: Record<string, number>;
}

/** Persisted earnings accumulator for one aligned window (hour or day). */
interface EarningWindowNode {
  /** Aligned window start (epoch millis); a different start resets the total. */
  windowStartMs: number;
  /** Credited earnings accumulated within the window, in whole cents. */
  cents: number;
}

/** Convert a micro-cent amount to whole cents, rounding half-away-from-zero. */
function microcentsToCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

/** Options for {@link RealtimeDbCounterStore}. */
export interface RealtimeDbCounterStoreOptions {
  /** RTDB instance; defaults to the shared client (`getRealtimeDb`). */
  db?: Database;
  /** Root sub-tree path; defaults to {@link DEFAULT_ROOT_PATH}. */
  rootPath?: string;
  /** Injected clock for shadow-ban / velocity expiry (defaults to system time). */
  clock?: Clock;
  /** Injected id generator for batch tokens (defaults to random). */
  ids?: IdGenerator;
}

export class RealtimeDbCounterStore implements CounterStore {
  private readonly root: Reference;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(options: RealtimeDbCounterStoreOptions = {}) {
    const db = options.db ?? getRealtimeDb();
    this.root = db.ref(options.rootPath ?? DEFAULT_ROOT_PATH);
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new RandomIdGenerator();
  }

  // --- Hot path -----------------------------------------------------------

  async applyImpression(
    input: ApplyImpressionInput,
  ): Promise<ApplyImpressionResult> {
    const { developerId, campaignId, entryId, split, occurredAtMs } = input;

    const entry: LedgerEntry = {
      entryId,
      campaignId,
      developerId,
      revenueMicrocents: split.revenueMicrocents,
      developerCreditCents: split.developerCreditCents,
      spinshareRetentionMicrocents: split.spinshareRetentionMicrocents,
    };

    // 1. Idempotency gate: write the queued entry only if it does not exist.
    //    A non-null current value aborts the transaction (duplicate impression).
    const node: PendingNode = { entry, enqueuedAt: occurredAtMs };
    const result = await this.ledgerRef(entryId).transaction((current) =>
      current === null ? node : undefined,
    );

    if (!result.committed) {
      // Duplicate (already pending, in-flight, or recently flushed) → no money
      // moves. Echo the current pending counters.
      return {
        applied: false,
        balanceCents: await this.getBalanceCents(developerId),
        budgetCents: await this.getBudgetCents(campaignId),
        entryId,
      };
    }

    // 2. Fresh impression → atomically bump the fast read counters. Budget is
    //    decremented by the full per-impression revenue (Req 2.4).
    await this.root.update({
      [`bal/${developerId}`]: ServerValue.increment(split.developerCreditCents),
      [`bud/${campaignId}`]: ServerValue.increment(-split.revenueMicrocents),
    });

    return {
      applied: true,
      balanceCents: await this.getBalanceCents(developerId),
      budgetCents: await this.getBudgetCents(campaignId),
      entryId,
    };
  }

  async getBalanceCents(userId: string): Promise<number> {
    const snap = await this.root.child(`bal/${userId}`).get();
    return (snap.val() as number | null) ?? 0;
  }

  async getBudgetCents(campaignId: string): Promise<number> {
    const snap = await this.root.child(`bud/${campaignId}`).get();
    return microcentsToCents((snap.val() as number | null) ?? 0);
  }

  // --- Velocity + shadow-ban ---------------------------------------------

  async incrementVelocity(
    userId: string,
    windowStartEpochSec: number,
  ): Promise<number> {
    const ref = this.root.child(`velocity/${userId}/${windowStartEpochSec}`);
    const result = await ref.transaction((current) =>
      ((current as number | null) ?? 0) + 1,
    );
    return (result.snapshot.val() as number | null) ?? 1;
  }

  async isShadowBanned(userId: string): Promise<boolean> {
    const ref = this.root.child(`shadowban/${userId}`);
    const snap = await ref.get();
    const expiresAtMs = snap.val() as number | null;
    if (expiresAtMs === null) return false;
    if (this.clock.nowMs() >= expiresAtMs) {
      // TTL elapsed → automatic restore (RTDB has no native key TTL).
      await ref.remove();
      return false;
    }
    return true;
  }

  async setShadowBan(userId: string, ttlSeconds: number): Promise<void> {
    await this.root
      .child(`shadowban/${userId}`)
      .set(this.clock.nowMs() + ttlSeconds * 1000);
  }

  async incrementCampaignTelemetry(
    campaignId: string,
    metric: CampaignTelemetryMetric,
  ): Promise<void> {
    await this.root.update({
      [`campaignTelemetry/${campaignId}/${metric}`]: ServerValue.increment(1),
    });
  }

  async getCampaignTelemetry(
    campaignIds: string[],
  ): Promise<Record<string, CampaignTelemetry>> {
    const result: Record<string, CampaignTelemetry> = {};
    await Promise.all(
      [...new Set(campaignIds)].map(async (campaignId) => {
        const snap = await this.root.child(`campaignTelemetry/${campaignId}`).get();
        const raw = (snap.val() ?? {}) as Partial<
          Record<CampaignTelemetryMetric, number>
        >;
        const telemetry = zeroCampaignTelemetry();
        for (const metric of CAMPAIGN_TELEMETRY_METRICS) {
          telemetry[metric] = Number(raw[metric] ?? 0);
        }
        result[campaignId] = telemetry;
      }),
    );
    return result;
  }

  // --- Earning caps -------------------------------------------------------

  async getEarnedCentsInWindows(
    userId: string,
    nowMs: number,
  ): Promise<{ hourlyCents: number; dailyCents: number }> {
    const [hourSnap, daySnap] = await Promise.all([
      this.root.child(`earnHour/${userId}`).get(),
      this.root.child(`earnDay/${userId}`).get(),
    ]);
    const hour = hourSnap.val() as EarningWindowNode | null;
    const day = daySnap.val() as EarningWindowNode | null;
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
    const dayStart = dayWindowStartMs(nowMs);
    // Transaction per window: reset the accumulator when the aligned window has
    // rolled over, otherwise add to it. Keeps the cap correct under concurrency.
    await Promise.all([
      this.root.child(`earnHour/${userId}`).transaction((current) => {
        const node = current as EarningWindowNode | null;
        if (node && node.windowStartMs === hourStart) {
          return { windowStartMs: hourStart, cents: node.cents + amountCents };
        }
        return { windowStartMs: hourStart, cents: amountCents };
      }),
      this.root.child(`earnDay/${userId}`).transaction((current) => {
        const node = current as EarningWindowNode | null;
        if (node && node.windowStartMs === dayStart) {
          return { windowStartMs: dayStart, cents: node.cents + amountCents };
        }
        return { windowStartMs: dayStart, cents: amountCents };
      }),
    ]);
  }

  // --- Reconciliation support --------------------------------------------

  async drainPending(maxEntries: number): Promise<PendingBatch> {
    const batchToken = this.ids.next("batch");

    const snap = await this.root.child("pending/ledger").get();
    const nodes: Array<{ entryId: string; node: PendingNode }> = [];
    snap.forEach((child) => {
      nodes.push({ entryId: child.key!, node: child.val() as PendingNode });
      return false; // keep iterating
    });
    // FIFO: oldest enqueued first.
    nodes.sort((a, b) => a.node.enqueuedAt - b.node.enqueuedAt);
    const chosen = nodes.slice(0, Math.max(0, maxEntries));

    const entries: LedgerEntry[] = [];
    const balanceDeltaCentsByUser: Record<string, number> = {};
    const budgetDeltaMicrocentsByCampaign: Record<string, number> = {};
    const updates: Record<string, unknown> = {};

    for (const { entryId, node } of chosen) {
      entries.push(node.entry);
      // Move from the pending queue into this batch's in-flight area.
      updates[`pending/ledger/${entryId}`] = null;
      updates[`inflight/${batchToken}/entries/${entryId}`] = node;

      balanceDeltaCentsByUser[node.entry.developerId] =
        (balanceDeltaCentsByUser[node.entry.developerId] ?? 0) +
        node.entry.developerCreditCents;
      budgetDeltaMicrocentsByCampaign[node.entry.campaignId] =
        (budgetDeltaMicrocentsByCampaign[node.entry.campaignId] ?? 0) -
        node.entry.revenueMicrocents;
    }

    // Record the aggregate deltas so ackDrained can subtract them from the fast
    // counters once the durable write succeeds. Always written (even for an
    // empty batch) so the in-flight node exists and ack/nack can find it.
    const meta: BatchMeta = {
      balanceDeltaCentsByUser,
      budgetDeltaMicrocentsByCampaign,
    };
    updates[`inflight/${batchToken}/meta`] = meta;

    await this.root.update(updates);

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
    const inflightRef = this.root.child(`inflight/${batchToken}`);
    const snap = await inflightRef.get();
    if (!snap.exists()) return; // idempotent: unknown / already-acked token.

    const meta = (snap.child("meta").val() as BatchMeta | null) ?? {
      balanceDeltaCentsByUser: {},
      budgetDeltaMicrocentsByCampaign: {},
    };

    // Durable write succeeded → subtract the drained deltas from the pending
    // counters so they are never flushed again, and drop the in-flight node.
    const updates: Record<string, unknown> = {};
    for (const [userId, deltaCents] of Object.entries(
      meta.balanceDeltaCentsByUser,
    )) {
      if (deltaCents !== 0) {
        updates[`bal/${userId}`] = ServerValue.increment(-deltaCents);
      }
    }
    for (const [campaignId, deltaMicrocents] of Object.entries(
      meta.budgetDeltaMicrocentsByCampaign,
    )) {
      if (deltaMicrocents !== 0) {
        updates[`bud/${campaignId}`] = ServerValue.increment(-deltaMicrocents);
      }
    }
    updates[`inflight/${batchToken}`] = null;

    await this.root.update(updates);
  }

  async nackDrained(batchToken: string): Promise<void> {
    const inflightRef = this.root.child(`inflight/${batchToken}`);
    const snap = await inflightRef.get();
    if (!snap.exists()) return; // idempotent: unknown / already-acked token.

    // Durable write failed → return the drained entries to the pending queue so
    // the next flush cycle retries them (Requirement 3.4). The fast counters
    // were never touched by drainPending (only by applyImpression / ack), so
    // re-surfacing the entries fully restores the batch.
    const updates: Record<string, unknown> = {};
    const entriesSnap = snap.child("entries");
    entriesSnap.forEach((child) => {
      updates[`pending/ledger/${child.key!}`] = child.val() as PendingNode;
      return false;
    });
    updates[`inflight/${batchToken}`] = null;

    await this.root.update(updates);
  }

  /** Reference to a single queued ledger node. */
  private ledgerRef(entryId: string): Reference {
    return this.root.child(`pending/ledger/${entryId}`);
  }
}
