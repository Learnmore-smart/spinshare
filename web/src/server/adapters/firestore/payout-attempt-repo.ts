import {
  FieldValue,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  PayoutAttempt,
  PayoutAttemptRepository,
  PayoutAttemptStatus,
  PayoutAttemptUpdate,
} from "../../ports/payout-attempt-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS } from "./collections";

export interface FirestorePayoutAttemptRepoOptions {
  db?: Firestore;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toPayoutAttempt(id: string, data: DocumentData): PayoutAttempt {
  return {
    attemptId: String(data.attemptId ?? id),
    developerId: String(data.developerId ?? ""),
    status: data.status as PayoutAttemptStatus,
    createdAtMs: Number(data.createdAtMs ?? 0),
    updatedAtMs: Number(data.updatedAtMs ?? data.createdAtMs ?? 0),
    ...(toNumberOrUndefined(data.amountCents) !== undefined
      ? { amountCents: Number(data.amountCents) }
      : {}),
    ...(typeof data.stripeConnectAccountId === "string"
      ? { stripeConnectAccountId: data.stripeConnectAccountId }
      : {}),
    ...(typeof data.providerEventId === "string"
      ? { providerEventId: data.providerEventId }
      : {}),
    ...(toNumberOrUndefined(data.providerStatus) !== undefined
      ? { providerStatus: Number(data.providerStatus) }
      : {}),
    ...(typeof data.providerCode === "string"
      ? { providerCode: data.providerCode }
      : {}),
  };
}

export class FirestorePayoutAttemptRepo
  implements PayoutAttemptRepository
{
  private readonly db: Firestore;

  constructor(options: FirestorePayoutAttemptRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.payoutAttempts);
  }

  async record(attempt: PayoutAttempt): Promise<void> {
    const ref = this.collection.doc(attempt.attemptId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        return;
      }
      tx.set(ref, {
        ...attempt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async update(
    attemptId: string,
    update: PayoutAttemptUpdate,
  ): Promise<void> {
    await this.collection.doc(attemptId).set(
      {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  async listByDeveloper(developerId: string): Promise<PayoutAttempt[]> {
    const snap = await this.collection
      .where("developerId", "==", developerId)
      .get();
    return snap.docs
      .map((doc) => toPayoutAttempt(doc.id, doc.data()))
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }
}
