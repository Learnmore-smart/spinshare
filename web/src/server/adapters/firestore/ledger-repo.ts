/**
 * Firestore-backed `LedgerRepository`.
 *
 * Mirrors the `ledgerEntries/{entryId}` collection — one durable record per
 * impression. Idempotency is achieved by using each entry's deterministic
 * `entryId` as the document id: `appendEntries` runs a single transaction that
 * reads the target docs and only writes the ones that do not already exist, so
 * a retried/partially-written flush batch can never double-write or
 * double-count. See design "Redis→Firestore Flush_Process" (idempotent durable
 * write keyed by `entryId`).
 */

import type { LedgerEntry } from "@spinshare/core";
import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

import type { LedgerRepository, FleetLedgerSummary } from "../../ports/ledger-repository";
import { summarizeFleetFromEntries } from "../../fleet-ledger-summary";
import { getFirestoreClient } from "./client";
import { COLLECTIONS, toLedgerEntry } from "./collections";

/**
 * Best-effort conversion of a persisted `createdAt` value to epoch millis for
 * in-memory ordering. Accepts a Firestore `Timestamp` (has `toMillis`), a
 * `Date`, or a numeric millis value; anything else (e.g. a not-yet-resolved
 * server timestamp) sorts as `0` so it lands first in recording order.
 */
function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis(): number }).toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
}

/** Options for {@link FirestoreLedgerRepo}. */
export interface FirestoreLedgerRepoOptions {
  /** Firestore instance; defaults to the shared client. */
  db?: Firestore;
}

export class FirestoreLedgerRepo implements LedgerRepository {
  private readonly db: Firestore;

  constructor(options: FirestoreLedgerRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.ledgerEntries);
  }

  /**
   * Appends ledger entries durably, idempotent by `entryId`. Already-persisted
   * entries are skipped (no-op), so flush retries never double-count.
   */
  async appendEntries(entries: LedgerEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    // De-duplicate by entryId within the input itself so a single batch never
    // contains two writes to the same document.
    const uniqueById = new Map<string, LedgerEntry>();
    for (const entry of entries) {
      if (!uniqueById.has(entry.entryId)) {
        uniqueById.set(entry.entryId, entry);
      }
    }
    const unique = [...uniqueById.values()];

    await this.db.runTransaction(async (tx) => {
      const refs: DocumentReference[] = unique.map((e) =>
        this.collection.doc(e.entryId),
      );
      const snaps = await tx.getAll(...refs);
      snaps.forEach((snap, i) => {
        if (snap.exists) {
          // Already durably persisted on a prior flush — leave untouched.
          return;
        }
        const entry = unique[i]!;
        const ref = refs[i]!;
        tx.set(ref, {
          entryId: entry.entryId,
          ...(entry.type !== undefined ? { type: entry.type } : {}),
          campaignId: entry.campaignId,
          developerId: entry.developerId,
          revenueMicrocents: entry.revenueMicrocents,
          developerCreditCents: entry.developerCreditCents,
          spinshareRetentionMicrocents: entry.spinshareRetentionMicrocents,
          ...(entry.creditCents !== undefined
            ? { creditCents: entry.creditCents }
            : {}),
          ...(entry.description !== undefined
            ? { description: entry.description }
            : {}),
          createdAt: FieldValue.serverTimestamp(),
          flushedAt: FieldValue.serverTimestamp(),
        });
      });
    });
  }

  async getByEntryId(entryId: string): Promise<LedgerEntry | null> {
    const doc = await this.collection.doc(entryId).get();
    if (!doc.exists) {
      return null;
    }
    return toLedgerEntry(doc.id, doc.data() ?? {});
  }

  async appendEntryIfAbsent(entry: LedgerEntry): Promise<boolean> {
    const ref = this.collection.doc(entry.entryId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        return false;
      }
      tx.set(ref, {
        entryId: entry.entryId,
        ...(entry.type !== undefined ? { type: entry.type } : {}),
        campaignId: entry.campaignId,
        developerId: entry.developerId,
        revenueMicrocents: entry.revenueMicrocents,
        developerCreditCents: entry.developerCreditCents,
        spinshareRetentionMicrocents: entry.spinshareRetentionMicrocents,
        ...(entry.creditCents !== undefined
          ? { creditCents: entry.creditCents }
          : {}),
        ...(entry.description !== undefined
          ? { description: entry.description }
          : {}),
        createdAt: FieldValue.serverTimestamp(),
        flushedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
  }

  /**
   * Lists every durable entry credited to a developer, ordered by recording
   * time (`createdAt`). Powers the developer dashboard (Requirements 8.1–8.3).
   *
   * Filters by `developerId` only — a single-field index Firestore maintains
   * automatically — and orders by `createdAt` IN MEMORY. Combining the
   * `developerId` filter with an `orderBy("createdAt")` in the query would
   * require a composite index; without one Firestore throws
   * `FAILED_PRECONDITION` for *every* developer (even one with no entries),
   * which the dashboard would surface as a load error instead of the proper
   * $0 / empty state. Sorting client-side keeps the query index-free so an
   * empty ledger reliably returns `[]`.
   */
  async listByDeveloper(developerId: string): Promise<LedgerEntry[]> {
    const snap = await this.collection
      .where("developerId", "==", developerId)
      .get();
    return snap.docs
      .slice()
      .sort(
        (a, b) =>
          toMillis(a.get("createdAt")) - toMillis(b.get("createdAt")),
      )
      .map((doc) => toLedgerEntry(doc.id, doc.data()));
  }

  async countByCampaignIds(campaignIds: string[]): Promise<Record<string, number>> {
    const counts = Object.fromEntries(campaignIds.map((id) => [id, 0]));
    if (campaignIds.length === 0) {
      return counts;
    }

    const snap = await this.collection
      .where("campaignId", "in", campaignIds.slice(0, 30))
      .get();

    for (const doc of snap.docs) {
      if (doc.get("type") === "signup_bonus") {
        continue;
      }
      const campaignId = String(doc.get("campaignId") ?? "");
      if (campaignId.length === 0) {
        continue;
      }
      if (counts[campaignId] !== undefined) {
        counts[campaignId] += 1;
      }
    }

    return counts;
  }

  async summarizeFleet(nowMs = Date.now()): Promise<FleetLedgerSummary> {
    const snap = await this.collection.get();
    const entries = snap.docs.map((doc) => toLedgerEntry(doc.id, doc.data() ?? {}));
    return summarizeFleetFromEntries(entries, nowMs);
  }
}
