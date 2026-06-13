/**
 * `/api/webhooks/stripe` — Stripe funding webhook receiver.
 *
 * Thin HTTP adapter over the {@link PaymentGateway} + {@link PaymentEventStore}
 * (wired from the composition-root {@link getContainer container}). On a
 * `checkout.session.completed` event it credits the funded campaign's budget,
 * exactly once, and acknowledges with `200` so Stripe stops retrying.
 *
 * Flow (design "/api/webhooks/stripe", R9.8–R9.10):
 *
 *   1. Read the **raw** request body and the `Stripe-Signature` header. The raw
 *      bytes matter — signature verification is byte-exact, so we must never
 *      re-serialize via `request.json()`.
 *   2. Verify + parse via {@link PaymentGateway.verifyAndParseWebhook}. It throws
 *      on a bad/missing signature; we return `400` and perform NO mutation
 *      (R9.10).
 *   3. Claim the event atomically via {@link PaymentEventStore.markApplied}
 *      keyed by the Stripe event id. Claiming *before* moving money is the only
 *      concurrency-safe ordering: a redelivered event can never re-pass the gate
 *      (R9.9). Only the first claim increments `campaigns/{id}.budgetCents` by
 *      `amountCents` (R9.8); duplicates skip the increment.
 *   4. Always return `200` for a verified event — including duplicates — so
 *      Stripe stops retrying.
 *
 * The funding reflects within Stripe's retry/visibility budget (≤60s) because
 * the increment happens synchronously within this request (R9.8).
 */

import { getContainer } from "@/server/container";

/** Always evaluate at request time; this is a side-effecting webhook receiver. */
export const dynamic = "force-dynamic";

/** Header carrying the Stripe webhook signature. */
const SIGNATURE_HEADER = "stripe-signature";

/** Stripe event type that confirms funding and credits the campaign budget. */
const FUNDING_EVENT_TYPE = "checkout.session.completed";

export async function POST(request: Request): Promise<Response> {
  // 1. Capture the RAW body bytes and the signature header. Verification is
  //    byte-exact, so read the body as-is (never via request.json()).
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";

  const { payments, paymentEvents, campaigns } = getContainer();

  // 2. Verify + parse. A bad/missing signature throws → 400 with no mutation
  //    (R9.10).
  let event;
  try {
    event = payments.verifyAndParseWebhook(rawBody, signature);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  // 3. Only funding events move money; other verified event types are simply
  //    acknowledged (200) so Stripe stops retrying.
  if (event.type === FUNDING_EVENT_TYPE) {
    // Atomically claim the event before crediting. Only the first delivery for
    // this event id wins the claim and applies the increment; redeliveries get
    // `false` and skip the mutation (R9.8, R9.9).
    const newlyApplied = await paymentEvents.markApplied(event.id, {
      campaignId: event.campaignId,
      amountCents: event.amountCents,
    });
    if (newlyApplied) {
      await campaigns.applyBudgetDeltaCents(event.campaignId, event.amountCents);
    }
  }

  // 4. Always acknowledge a verified event (even a duplicate) with 200.
  return Response.json({ received: true }, { status: 200 });
}
