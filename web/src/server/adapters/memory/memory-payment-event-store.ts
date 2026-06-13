/**
 * In-memory {@link PaymentEventStore} — local/test stand-in for the Firestore
 * `paymentEvents/{stripeEventId}` collection.
 *
 * Idempotency is enforced by a single `Map` keyed by event id. Because Node's
 * event loop runs each promise body to completion without interleaving
 * synchronous sections, the check-and-set in {@link markApplied} is atomic: the
 * first caller for an id inserts the record and returns `true`; every later
 * caller sees the existing record and returns `false`.
 */

import type {
  PaymentEventRecord,
  PaymentEventStore,
} from "../../ports/payment-event-store";

export class MemoryPaymentEventStore implements PaymentEventStore {
  private readonly applied = new Map<string, PaymentEventRecord>();

  async hasApplied(eventId: string): Promise<boolean> {
    return this.applied.has(eventId);
  }

  async markApplied(
    eventId: string,
    record: PaymentEventRecord,
  ): Promise<boolean> {
    if (this.applied.has(eventId)) {
      return false;
    }
    this.applied.set(eventId, { ...record });
    return true;
  }
}
