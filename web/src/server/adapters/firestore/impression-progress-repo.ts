import {
  FieldValue,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  AddImpressionProgressInput,
  ImpressionProgress,
  ImpressionProgressRepository,
} from "../../ports/impression-progress-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS } from "./collections";

export interface FirestoreImpressionProgressRepoOptions {
  db?: Firestore;
}

function toProgress(
  developerId: string,
  data: DocumentData,
): ImpressionProgress {
  return {
    developerId: String(data.developerId ?? developerId),
    campaignId: String(data.campaignId ?? ""),
    accumulatedViewDurationMs: Number(data.accumulatedViewDurationMs ?? 0),
    updatedAtMs: Number(data.updatedAtMs ?? 0),
    ...(data.servedAtMs !== undefined && data.servedAtMs !== null
      ? { servedAtMs: Number(data.servedAtMs) }
      : {}),
  };
}

export class FirestoreImpressionProgressRepo
  implements ImpressionProgressRepository
{
  private readonly db: Firestore;

  constructor(options: FirestoreImpressionProgressRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.impressionProgress);
  }

  async getByDeveloper(
    developerId: string,
  ): Promise<ImpressionProgress | null> {
    const doc = await this.collection.doc(developerId).get();
    if (!doc.exists) {
      return null;
    }
    return toProgress(doc.id, doc.data() ?? {});
  }

  async addDuration(
    input: AddImpressionProgressInput,
  ): Promise<ImpressionProgress> {
    const ref = this.collection.doc(input.developerId);
    let next: ImpressionProgress | null = null;
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? toProgress(snap.id, snap.data() ?? {}) : null;
      const sameCampaign = existing && existing.campaignId === input.campaignId;
      const accumulatedViewDurationMs = sameCampaign
        ? existing.accumulatedViewDurationMs + input.viewDurationMs
        : input.viewDurationMs;
      // Preserve the immutable serve time across accumulating segments; reset it
      // only when a different campaign is served. Only `/api/ad` passes it.
      const servedAtMs = sameCampaign ? existing.servedAtMs : input.servedAtMs;
      next = {
        developerId: input.developerId,
        campaignId: input.campaignId,
        accumulatedViewDurationMs,
        updatedAtMs: input.nowMs,
        ...(servedAtMs !== undefined ? { servedAtMs } : {}),
      };
      tx.set(ref, {
        ...next,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return next!;
  }

  async clearDeveloper(developerId: string): Promise<void> {
    await this.collection.doc(developerId).delete();
  }
}
