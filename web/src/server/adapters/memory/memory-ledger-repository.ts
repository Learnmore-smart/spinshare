/**
 * In-memory {@link LedgerRepository} — local/test stand-in for the Firestore
 * `ledgerEntries/{entryId}` collection (one durable record per impression).
 *
 * `appendEntries` is idempotent keyed by `entryId`: re-appending an already
 * persisted entry is a no-op, so flush retries can never double-count
 * (design "Redis→Firestore Reconciliation").
 */

import type { LedgerEntry } from "@spinshare/core";
import type { LedgerRepository } from "../../ports/ledger-repository";

export class MemoryLedgerRepository implements LedgerRepository {
  private readonly entries = new Map<string, LedgerEntry>();

  async appendEntries(entries: LedgerEntry[]): Promise<void> {
    for (const entry of entries) {
      // Idempotent by entryId: first write wins, duplicates are ignored.
      if (!this.entries.has(entry.entryId)) {
        this.entries.set(entry.entryId, { ...entry });
      }
    }
  }

  /**
   * Lists every entry credited to a developer, in insertion (recording) order.
   * Powers the developer dashboard (Requirements 8.1–8.3).
   */
  async listByDeveloper(developerId: string): Promise<LedgerEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.developerId === developerId)
      .map((entry) => ({ ...entry }));
  }

  /** Test helper: all durably persisted entries, in insertion order. */
  all(): LedgerEntry[] {
    return [...this.entries.values()];
  }

  /** Test helper: a single persisted entry by id. */
  get(entryId: string): LedgerEntry | undefined {
    return this.entries.get(entryId);
  }

  /** Test helper: number of durable entries. */
  get size(): number {
    return this.entries.size;
  }
}
