/**
 * In-memory {@link LedgerRepository} — local/test stand-in for the Firestore
 * `ledgerEntries/{entryId}` collection (one durable record per impression).
 *
 * `appendEntries` is idempotent keyed by `entryId`: re-appending an already
 * persisted entry is a no-op, so flush retries can never double-count
 * (design "Redis→Firestore Reconciliation").
 */

import type { LedgerEntry } from "@spinshare/core";
import type {
  FleetLedgerSummary,
  LedgerRepository,
} from "../../ports/ledger-repository";
import { summarizeFleetFromEntries } from "../../fleet-ledger-summary";

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

  async getByEntryId(entryId: string): Promise<LedgerEntry | null> {
    const entry = this.entries.get(entryId);
    return entry ? { ...entry } : null;
  }

  async appendEntryIfAbsent(entry: LedgerEntry): Promise<boolean> {
    if (this.entries.has(entry.entryId)) {
      return false;
    }
    this.entries.set(entry.entryId, { ...entry });
    return true;
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

  async countByCampaignIds(campaignIds: string[]): Promise<Record<string, number>> {
    const counts = Object.fromEntries(campaignIds.map((id) => [id, 0]));

    for (const entry of this.entries.values()) {
      if (entry.type === "signup_bonus" || entry.campaignId.length === 0) {
        continue;
      }
      const current = counts[entry.campaignId];
      if (current !== undefined) {
        counts[entry.campaignId] = current + 1;
      }
    }

    return counts;
  }

  async summarizeFleet(nowMs = Date.now()): Promise<FleetLedgerSummary> {
    return summarizeFleetFromEntries([...this.entries.values()], nowMs);
  }

  /**
   * Test/seed helper: inserts fully-formed entries synchronously, idempotent by
   * `entryId` (first write wins). Mirrors `appendEntries` without the async
   * boundary so the composition root can seed local data during construction.
   */
  seed(entries: readonly LedgerEntry[]): void {
    for (const entry of entries) {
      if (!this.entries.has(entry.entryId)) {
        this.entries.set(entry.entryId, { ...entry });
      }
    }
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
