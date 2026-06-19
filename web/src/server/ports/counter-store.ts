/**
 * CounterStore port — the hot path.
 *
 * Backed by Firebase Realtime Database in production
 * (`RealtimeDbCounterStore`) or an in-memory store locally
 * (`MemoryCounterStore`). Holds the pending balance/budget deltas,
 * velocity windows, shadow-ban flags, and the pending ledger queue between
 * flushes. See design "Provider Abstraction Layer (Ports)" and the RTDB key
 * schema (hot path).
 *
 * All monetary values are integers: whole cents (`*Cents`) for durable balances
 * and budgets, micro-cents (`*Microcents`, 1 cent = 1000 micro-cents) for
 * exact sub-cent revenue/retention.
 */

import type { LedgerEntry, Split } from "@spinshare/core";

export const CAMPAIGN_TELEMETRY_METRICS = [
  "shows",
  "clicks",
  "credited",
  "tooShort",
  "invalidToken",
  "invalidCampaign",
  "shadowBanned",
  "earningCapped",
  "duplicate",
] as const;

export type CampaignTelemetryMetric =
  (typeof CAMPAIGN_TELEMETRY_METRICS)[number];

export interface CampaignTelemetry {
  shows: number;
  clicks: number;
  credited: number;
  tooShort: number;
  invalidToken: number;
  invalidCampaign: number;
  shadowBanned: number;
  earningCapped: number;
  duplicate: number;
}

export function zeroCampaignTelemetry(): CampaignTelemetry {
  return {
    shows: 0,
    clicks: 0,
    credited: 0,
    tooShort: 0,
    invalidToken: 0,
    invalidCampaign: 0,
    shadowBanned: 0,
    earningCapped: 0,
    duplicate: 0,
  };
}

/**
 * Inputs to an atomic impression application.
 *
 * `applyImpression` credits the developer balance by `split.developerCreditCents`,
 * decrements the campaign budget by the full per-impression revenue, and
 * enqueues a durable `LedgerEntry` keyed by `entryId` (the deterministic
 * idempotency key) — all under a single critical section.
 */
export interface ApplyImpressionInput {
  /** Developer credited for the impression. */
  developerId: string;
  /** Campaign the impression is attributed to. */
  campaignId: string;
  /** Deterministic ledger entry id (idempotency key). */
  entryId: string;
  /** Pre-computed payout split (from `@spinshare/core` `computeSplit`). */
  split: Split;
  /** Impression time in epoch millis (injected `Clock` for determinism). */
  occurredAtMs: number;
}

/**
 * Outcome of an atomic impression application.
 *
 * `applied` is `true` when money moved and a ledger entry was enqueued, and
 * `false` when the impression was suppressed (e.g. shadow-ban handled upstream
 * or insufficient budget) so that no partial money movement occurred.
 */
export interface ApplyImpressionResult {
  /** Whether the impression moved money and enqueued a ledger entry. */
  applied: boolean;
  /** Resulting pending developer balance delta in integer cents. */
  balanceCents: number;
  /** Resulting remaining campaign budget in integer cents. */
  budgetCents: number;
  /** The ledger entry id that was enqueued (echoes the input idempotency key). */
  entryId: string;
}

/**
 * A batch of pending work drained for one reconciliation cycle.
 *
 * Contains the queued ledger entries plus the aggregated balance/budget deltas
 * since the last flush. `batchToken` identifies the in-flight batch so it can
 * be acknowledged (`ackDrained`) only after the durable Firestore transaction
 * succeeds; on failure the batch is retained for retry.
 */
export interface PendingBatch {
  /** Opaque token identifying this drained batch for later acknowledgement. */
  batchToken: string;
  /** Ledger entries awaiting durable persistence (one per impression). */
  entries: LedgerEntry[];
  /** Aggregate developer balance deltas (cents) keyed by user id. */
  balanceDeltaCentsByUser: Record<string, number>;
  /** Aggregate campaign budget deltas (cents, negative) keyed by campaign id. */
  budgetDeltaCentsByCampaign: Record<string, number>;
}

/**
 * Hot-path counter store: atomic impression application, balance/budget reads,
 * velocity + shadow-ban tracking, and reconciliation drain/ack support.
 */
export interface CounterStore {
  /**
   * Atomically applies an impression: credits balance, decrements budget,
   * increments velocity counter, enqueues a ledger entry. Returns the outcome.
   */
  applyImpression(input: ApplyImpressionInput): Promise<ApplyImpressionResult>;

  /** Reads the pending developer balance delta (integer cents). */
  getBalanceCents(userId: string): Promise<number>;
  /** Reads the remaining campaign budget (integer cents). */
  getBudgetCents(campaignId: string): Promise<number>;

  // Earning caps (server-enforced anti-abuse)
  /**
   * Reads the developer's already-credited earnings within the current rolling
   * hour and UTC day windows (integer cents). Used by the ledger service to
   * enforce the hourly/daily earning caps before crediting a new impression.
   */
  getEarnedCentsInWindows(
    userId: string,
    nowMs: number,
  ): Promise<{ hourlyCents: number; dailyCents: number }>;
  /**
   * Records `amountCents` of credited earnings toward the developer's current
   * hour and day windows. Called only when an impression actually moves money,
   * so suppressed (banned/capped) impressions never count toward the caps.
   */
  addEarnedCents(
    userId: string,
    amountCents: number,
    nowMs: number,
  ): Promise<void>;

  // Velocity + shadow-ban
  /** Increments and returns the impression count for the user's fixed 60s window. */
  incrementVelocity(userId: string, windowStartEpochSec: number): Promise<number>;
  /** Reports whether the user currently has an active shadow-ban. */
  isShadowBanned(userId: string): Promise<boolean>;
  /** Sets a shadow-ban for the user that expires after `ttlSeconds`. */
  setShadowBan(userId: string, ttlSeconds: number): Promise<void>;

  // Network-level signals (Tier 2 — cross the per-userId silo; score feeders)
  /**
   * Increments and returns the impression count for an IP hash in a fixed
   * window. A network-level rate that a per-userId velocity cap cannot see
   * (one box, many accounts). The window expires like the per-user velocity one.
   */
  incrementIpVelocity(ipHash: string, windowStartEpochSec: number): Promise<number>;
  /**
   * Records that `developerId` was active on `ipHash` within the (day-aligned)
   * fan-out window and returns the number of DISTINCT developer ids seen on that
   * IP in the window. A high count is an account-farm signal.
   */
  recordIpFanout(
    ipHash: string,
    developerId: string,
    windowStartEpochSec: number,
  ): Promise<number>;

  // Single-use keys (nonce / token replay protection)
  /**
   * Atomically marks `key` as consumed. Returns `true` on the FIRST consumption
   * within its TTL (the caller may proceed) and `false` if the key was already
   * consumed (a replay — the caller must reject). Entries older than their TTL
   * are treated as never-consumed, so the key space self-cleans without a sweep.
   * Backs single-use ad nonces (`/api/ad` → `/api/track`) and single-use
   * clickTokens.
   */
  consumeOnce(key: string, ttlSeconds: number): Promise<boolean>;

  // Campaign telemetry
  incrementCampaignTelemetry(
    campaignId: string,
    metric: CampaignTelemetryMetric,
  ): Promise<void>;
  getCampaignTelemetry(
    campaignIds: string[],
  ): Promise<Record<string, CampaignTelemetry>>;

  // Reconciliation support
  /** Drains up to `maxEntries` pending entries + aggregate deltas as one batch. */
  drainPending(maxEntries: number): Promise<PendingBatch>;
  /** Acknowledges a drained batch after durable persistence succeeds. */
  ackDrained(batchToken: string): Promise<void>;
  /**
   * Returns an un-acknowledged in-flight batch to the pending queue so it is
   * retried on a subsequent flush cycle. Called when the durable write fails so
   * the batch is never lost (Requirement 3.4). Idempotent: an unknown /
   * already-acked token is a no-op.
   */
  nackDrained(batchToken: string): Promise<void>;
}
