/**
 * LedgerRepository port — durable ledger storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `ledgerEntries/{entryId}` collection (one durable record per impression).
 * See design "Data Models" and the Redis→Firestore Flush_Process.
 */

import type { LedgerEntry } from "@spinshare/core";

/** Fleet-wide ledger aggregates for internal analytics. */
export interface FleetLedgerSummary {
  /** Credited impressions excluding signup-bonus rows. */
  totalCreditedImpressions: number;
  /** Sum of developer credits from impression rows. */
  totalDeveloperCreditCents: number;
  /** Credited impressions recorded since UTC midnight. */
  impressionsToday: number;
  /** Developer credits recorded since UTC midnight. */
  developerCreditsTodayCents: number;
  /**
   * Distinct developers with any durable ledger footprint (an impression credit
   * or the sign-up bonus row). The ledger is append-only, so this is a
   * deletion-proof developer headcount — unlike counting `users/{id}` docs,
   * which a migration can prune or which device/JWT credits may never create.
   */
  distinctDevelopers: number;
}

/** Durable ledger repository. */
export interface LedgerRepository {
  /**
   * Appends ledger entries durably. Idempotent by `entryId`: re-appending an
   * already-persisted entry is a no-op, so flush retries never double-count.
   */
  appendEntries(entries: LedgerEntry[]): Promise<void>;

  /** Loads a single durable entry by id, or `null` when absent. */
  getByEntryId(entryId: string): Promise<LedgerEntry | null>;

  /**
   * Persists one entry only when its `entryId` is not already present. Returns
   * `true` when the row was newly written and `false` when it already existed.
   */
  appendEntryIfAbsent(entry: LedgerEntry): Promise<boolean>;

  /**
   * Lists every durable ledger entry credited to a developer, in the order they
   * were recorded. Powers the developer dashboard's earnings summary and
   * activity table (Requirements 8.1–8.3).
   */
  listByDeveloper(developerId: string): Promise<LedgerEntry[]>;

  /**
   * Counts durable impressions per campaign id. Used by the public market table
   * to show served vs purchased impressions without scanning the full ledger on
   * the client.
   */
  countByCampaignIds(campaignIds: string[]): Promise<Record<string, number>>;
  /** Aggregates fleet-wide impression metrics (internal analytics only). */
  summarizeFleet(nowMs?: number): Promise<FleetLedgerSummary>;
}
