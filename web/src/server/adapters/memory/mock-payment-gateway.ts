/**
 * Mock {@link PaymentGateway} — credential-free local/test stand-in for Stripe.
 *
 * - `createCheckoutSession` returns a deterministic session id + hosted URL.
 * - `verifyAndParseWebhook` validates a local, deterministic HMAC-SHA256
 *   signature over the raw body and throws on any mismatch (the route then
 *   returns 400 with no mutation). `signPayload` is the test-side counterpart
 *   used to forge correctly-signed webhook payloads.
 *
 * See design "Local Development & Testability Strategy" (MockPaymentGateway:
 * deterministic events, locally-signed test payloads) and the `/api/webhooks/
 * stripe` contract.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CheckoutInput,
  CheckoutSessionResult,
  PaymentGateway,
  StripeEvent,
} from "../../ports/payment-gateway";
import { RandomIdGenerator, type IdGenerator } from "./clock";

/** Default local signing secret. Override via the constructor for tests. */
const DEFAULT_WEBHOOK_SECRET = "whsec_mock_spinshare_local";

/** Base URL the mock hosted checkout "redirects" to. */
const CHECKOUT_BASE_URL = "https://mock.spinshare.local/checkout";

export class MockPaymentGateway implements PaymentGateway {
  constructor(
    private readonly ids: IdGenerator = new RandomIdGenerator(),
    private readonly webhookSecret: string = DEFAULT_WEBHOOK_SECRET,
  ) {}

  async createCheckoutSession(
    input: CheckoutInput,
  ): Promise<CheckoutSessionResult> {
    const sessionId = this.ids.next("cs");
    return {
      sessionId,
      url: input.successUrl ?? `${CHECKOUT_BASE_URL}/${sessionId}`,
      settled: true,
    };
  }

  verifyAndParseWebhook(rawBody: Buffer, signature: string): StripeEvent {
    const expected = this.computeSignature(rawBody);
    if (!this.signaturesMatch(expected, signature)) {
      throw new Error("invalid_signature");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new Error("invalid_payload");
    }
    return this.coerceEvent(parsed);
  }

  /**
   * Test helper: build a raw body + valid signature for an event, so tests can
   * exercise the verified path. Returns the exact `Buffer` that must be passed
   * back to {@link verifyAndParseWebhook} (signatures are byte-exact).
   */
  signPayload(event: StripeEvent): { rawBody: Buffer; signature: string } {
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");
    return { rawBody, signature: this.computeSignature(rawBody) };
  }

  private computeSignature(rawBody: Buffer): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }

  private signaturesMatch(expected: string, provided: string): boolean {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private coerceEvent(parsed: unknown): StripeEvent {
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("invalid_payload");
    }
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.id !== "string" ||
      typeof obj.type !== "string" ||
      typeof obj.campaignId !== "string" ||
      typeof obj.amountCents !== "number"
    ) {
      throw new Error("invalid_payload");
    }
    return {
      id: obj.id,
      type: obj.type,
      campaignId: obj.campaignId,
      amountCents: obj.amountCents,
    };
  }
}
