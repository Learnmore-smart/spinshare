/**
 * Firestore-backed {@link PaymentEventStore}.
 *
 * Mirrors the `paymentEvents/{stripeEventId}` collection — one record per
 * verified funding event. Atomic idempotency comes from `DocumentReference.
 * create()`, which fails with `ALREADY_EXISTS` (gRPC code 6) when the document
 * is already present: the first caller for an event id creates the record and
 * returns `true`; any redelivered event hits the existing doc and returns
 * `false`, so the webhook route never double-credits a campaign budget. The
 * `appliedAt` server timestamp records when the event was applied (design
 * "Data Models": presence ⇒ already applied).
 */

import { FieldValue, type Firestore } from "firebase-admin/firestore";

import type {
  PaymentEventRecord,
  PaymentEventStore,
} from "../../ports/payment-event-store";
import { getFirestoreClient } from "./client";
import { COLLECTIONS } from "./collections";

/** gRPC status code returned by Firestore when `create()` hits an existing doc. */
const ALREADY_EXISTS = 6;

/** Options for {@link FirestorePaymentEventStore}. */
export interface FirestorePaymentEventStoreOptions {
  /** Firestore instance; defaults to the shared client. */
  db?: Firestore;
}

export class FirestorePaymentEventStore implements PaymentEventStore {
  private readonly db: Firestore;

  constructor(options: FirestorePaymentEventStoreOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.paymentEvents);
  }

  async hasApplied(eventId: string): Promise<boolean> {
    const doc = await this.collection.doc(eventId).get();
    return doc.exists;
  }

  async markApplied(
    eventId: string,
    record: PaymentEventRecord,
  ): Promise<boolean> {
    const ref = this.collection.doc(eventId);
    try {
      // create() is atomic create-if-absent: it rejects when the doc exists, so
      // only the first caller for this event id ever succeeds.
      await ref.create({
        id: eventId,
        campaignId: record.campaignId,
        amountCents: record.amountCents,
        appliedAt: FieldValue.serverTimestamp(),
      });
      return true;
    } catch (error) {
      if (isAlreadyExists(error)) {
        return false;
      }
      throw error;
    }
  }
}

/** Narrows an unknown thrown value to a Firestore ALREADY_EXISTS error. */
function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === ALREADY_EXISTS
  );
}
