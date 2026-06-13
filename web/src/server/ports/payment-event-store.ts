/**
 * PaymentEventStore port — Stripe webhook idempotency.
 *
 * Mirrors the `paymentEvents/{stripeEventId}` collection (design "Data Models"):
 * each verified funding event is recorded exactly once so the
 * `/api/webhooks/stripe` handler can apply a budget increment at most once even
 * when Stripe redelivers the same event. The presence of a record ⇒ the event
 * has already been applied.
 *
 * {@link PaymentEventStore.markApplied} MUST be an atomic check-and-set: only the
 * first caller for a given `eventId` observes `true`; all concurrent/subsequent
 * callers observe `false`. The webhook route claims the event via `markApplied`
 * *before* moving any money, which is the only concurrency-safe ordering — two
 * redelivered events can never both pass the gate, so the budget can never be
 * double-credited (design "Idempotency everywhere money moves").
 */

/** Confirmed funding carried by a verified `checkout.session.completed` event. */
export interface PaymentEventRecord {
  /** Funded campaign id. */
  campaignId: string;
  /** Confirmed funding amount in integer cents. */
  amountCents: number;
}

/** Idempotency store keyed by Stripe event id. */
export interface PaymentEventStore {
  /**
   * Returns whether a payment event with the given id has already been applied
   * (i.e. a `paymentEvents/{eventId}` record exists).
   */
  hasApplied(eventId: string): Promise<boolean>;
  /**
   * Atomically records the event as applied. Returns `true` if this call newly
   * recorded it (the caller should apply the funding), or `false` if it was
   * already recorded by a prior/concurrent call (the caller must NOT re-apply).
   */
  markApplied(eventId: string, record: PaymentEventRecord): Promise<boolean>;
}
