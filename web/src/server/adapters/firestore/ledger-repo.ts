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

import type { LedgerRepository } from "../../ports/ledger-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS, toLedgerEntry } from "./collections";

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
          campaignId: entry.campaignId,
          developerId: entry.developerId,
          revenueMicrocents: entry.revenueMicrocents,
          developerCreditCents: entry.developerCreditCents,
          spinshareRetentionMicrocents: entry.spinshareRetentionMicrocents,
          createdAt: FieldValue.serverTimestamp(),
          flushedAt: FieldValue.serverTimestamp(),
        });
      });
    });
  }

  /**
   * Lists every durable entry credited to a developer, ordered by recording
   * time (`createdAt`). Powers the developer dashboard (Requirements 8.1–8.3).
   */
  async listByDeveloper(developerId: string): Promise<LedgerEntry[]> {
    const snap = await this.collection
      .where("developerId", "==", developerId)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((doc) => toLedgerEntry(doc.id, doc.data()));
  }
}
