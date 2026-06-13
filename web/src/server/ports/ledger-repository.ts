/**
 * LedgerRepository port — durable ledger storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `ledgerEntries/{entryId}` collection (one durable record per impression).
 * See design "Data Models" and the Redis→Firestore Flush_Process.
 */

import type { LedgerEntry } from "@spinshare/core";

/** Durable ledger repository. */
export interface LedgerRepository {
  /**
   * Appends ledger entries durably. Idempotent by `entryId`: re-appending an
   * already-persisted entry is a no-op, so flush retries never double-count.
   */
  appendEntries(entries: LedgerEntry[]): Promise<void>;

  /**
   * Lists every durable ledger entry credited to a developer, in the order they
   * were recorded. Powers the developer dashboard's earnings summary and
   * activity table (Requirements 8.1–8.3).
   */
  listByDeveloper(developerId: string): Promise<LedgerEntry[]>;
}
