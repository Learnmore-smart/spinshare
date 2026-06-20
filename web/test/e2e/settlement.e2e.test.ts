/**
 * End-to-end settlement test (task 15.2) — the money path's 60/40 split.
 *
 * This is the automated end-to-end settlement test from Requirement 11. It
 * proves that a single funded impression settles exactly: the developer balance
 * grows by 60% of the per-impression revenue, the campaign budget shrinks by the
 * full revenue, and SpinShare retains the remaining 40% — with no money created
 * or lost (Requirements 11.2–11.7). Requirements 11.1 and 11.8 (the app boots
 * and accepts requests within the 60-second startup timeout) are exercised by
 * booting the real server through the {@link startApp} harness.
 *
 * ── Why the settlement assertions run IN-PROCESS (and not over HTTP) ─────────
 *
 * The harness ({@link startApp}) boots Next.js in a SEPARATE OS process using
 * `SPINSHARE_MODE=local`, which selects the credential-free in-memory adapters
 * (no Firestore emulator is available in this environment). That server keeps
 * its balances, budgets, velocity counters, and pending-ledger queue inside its
 * own process memory. This test process cannot read that state, and the app
 * exposes no HTTP endpoint to mint a `Device_Auth_Token`, force a flush, or read
 * back durable balances. So a faithful, deterministic settlement check — which
 * must observe the durable balance/budget AFTER a flush — cannot be performed
 * purely over the wire against the harness server.
 *
 * Instead we run the money path IN-PROCESS against the exact same composition
 * root the server uses: we drive the real `POST /api/webhooks/stripe` and
 * `POST /api/track` route handlers and the real `runFlushCycle` against a
 * single {@link getContainer} container (memory adapters), then read durable
 * balances straight from the repositories. This is the same code the booted
 * server runs; only the transport differs (a direct function call instead of a
 * socket), which is what makes the durable state observable and the assertions
 * deterministic. All monetary expectations come from `@spinshare/core`'s
 * {@link computeSplit}, so the test and the implementation share one source of
 * truth and can never disagree.
 *
 * We ALSO exercise the HTTP boundary against the booted server (Requirement
 * 11.3's "POST /api/track" intent at the wire level): a malformed
 * `POST /api/track` is rejected with `400` and moves no money. Two environment
 * limitations shape this check:
 *   1. Minting a valid `Device_Auth_Token` over HTTP in mock mode is not
 *      possible (device-flow approval is a test-only driver, not an endpoint),
 *      so the credited-success path is verified in-process via the same route
 *      handler.
 *   2. In this environment the booted Next.js build does not bind the named
 *      exports from `@spinshare/core` (e.g. `trackRequestSchema`, `computeSplit`)
 *      into the `/api/track` route bundle — the same "Attempted import error …
 *      from @spinshare/core" interop issue documented in the harness. That makes
 *      the authenticated branch of the live route throw a `500`, so the only
 *      reliably-observable HTTP-boundary behavior is the malformed-body guard
 *      (which short-circuits with `400` *before* the unresolved schema is used).
 *      The settlement math is therefore proven in-process, where `@spinshare/core`
 *      resolves correctly. This route-bundle interop bug is unrelated to the
 *      settlement logic and is flagged for separate follow-up.
 *
 * Current status: `next build` followed by `SPINSHARE_E2E_NEXT_CMD=start`
 * successfully runs this suite. The in-process credited path remains necessary
 * only because the separately booted mock server has no HTTP test endpoint for
 * approving a device flow and sharing that minted token with this process.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MICROCENTS_PER_CENT,
  computeSplit,
  type Split,
} from "@spinshare/core";

import { getContainer, resetContainer } from "@/server/container";
import { runFlushCycle } from "@/server/flush-service";
import {
  MockAuthProvider,
  MockPaymentGateway,
} from "@/server/adapters/memory";
import type { StripeEvent } from "@/server/ports";
import { GET as adGet } from "@/app/api/ad/route";
import { POST as trackPost } from "@/app/api/track/route";
import { POST as stripeWebhookPost } from "@/app/api/webhooks/stripe/route";

import { startApp, type RunningApp } from "./harness";

/**
 * Fixed maximum CPM bid for the seeded campaign, in integer cents ($30.00 CPM).
 * Chosen so the per-impression revenue (`cpmCents / 1000`) is a clean 30 cents,
 * keeping the 60/40 split exact (18¢ developer credit, 12¢ retention).
 */
const FIXED_CPM_CENTS = 30_000;

/**
 * Test budget funded into the campaign, in integer cents ($1,000.00). Far
 * exceeds one impression's revenue, satisfying Requirement 11.2's "budget that
 * exceeds the per-impression revenue of one impression".
 */
const FUNDING_AMOUNT_CENTS = 100_000;

/** Environment keys this test mutates to drive the in-process container. */
const ENV_KEYS = [
  "SPINSHARE_MODE",
  "STRIPE_MODE",
  "AUTH_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
] as const;

/** Convert an exact micro-cent amount to whole cents (revenue is a clean value). */
function microcentsToCents(microcents: number): number {
  return microcents / MICROCENTS_PER_CENT;
}

/**
 * Asserts `actualCents` matches `expectedCents` within a one-US-cent tolerance,
 * and on mismatch fails with the expected value, the recorded value, and the
 * difference (Requirement 11.7).
 */
function expectWithinOneCent(
  label: string,
  expectedCents: number,
  actualCents: number,
): void {
  const difference = Math.abs(expectedCents - actualCents);
  if (difference > 1) {
    throw new Error(
      `${label}: expected ${expectedCents.toFixed(2)}¢, ` +
        `recorded ${actualCents.toFixed(2)}¢, ` +
        `difference ${difference.toFixed(2)}¢ exceeds the 1¢ tolerance ` +
        `(Requirement 11.7).`,
    );
  }
  expect(difference).toBeLessThanOrEqual(1);
}

/** Points the in-process container at the credential-free memory adapters. */
function configureLocalMemoryEnv(): void {
  process.env.SPINSHARE_MODE = "local";
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  process.env.SPINSHARE_COUNTER = "memory";
  // No emulator in this environment → force the pure in-memory repos so durable
  // balances/budgets are observable from this process.
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

describe("e2e settlement — 60/40 split (Requirement 11)", () => {
  let app: RunningApp;
  const envSnapshot: Record<string, string | undefined> = {};

  beforeAll(async () => {
    // Snapshot the env keys we mutate so other suites in this worker are
    // unaffected once we restore them.
    for (const key of ENV_KEYS) {
      envSnapshot[key] = process.env[key];
    }
    // Req 11.1 / 11.8: the app must boot and accept requests within 60s. The
    // harness throws (failing the suite) if it does not.
    app = await startApp();
  });

  afterAll(async () => {
    await app?.stop();
    // Restore env + clear the in-process container so we don't leak state.
    for (const key of ENV_KEYS) {
      const value = envSnapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetContainer();
  });

  it("boots and serves GET /api/health with 200 (Req 11.1, 11.8)", async () => {
    const res = await fetch(`${app.baseUrl}/api/health`);
    expect(res.status).toBe(200);
  });

  it("HTTP POST /api/track rejects malformed impressions and moves no money (Req 11.3 boundary)", async () => {
    // Over the wire against the booted server: a malformed body must be
    // rejected with 400 (no money movement), proving the money endpoint is
    // wired and guards bad input at the HTTP boundary. This path short-circuits
    // before the route touches `@spinshare/core` schemas, so it is observable
    // even though the live build does not bind those named exports (see the
    // module header); the authenticated credited path is verified in-process
    // in the settlement test below.
    const res = await fetch(`${app.baseUrl}/api/track`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_request_body");
  });

  it("settles one funded impression with the exact 60/40 split (Req 11.2–11.7)", async () => {
    // Bind the in-process container to the same memory adapters the booted
    // server uses, then seed deterministically. The route handlers below call
    // getContainer() and receive this very container.
    configureLocalMemoryEnv();
    resetContainer();
    const container = getContainer();

    // --- Seed the developer + a valid Device_Auth_Token ---------------------
    const developer = await container.users.upsertFromIdentity({
      provider: "github",
      providerAccountId: "settlement-developer",
      email: "developer@spinshare.test",
      emailVerified: true,
      role: "developer",
    });
    // Mint a valid token whose userId matches the developer (so the flush
    // credits the right durable balance). MockAuthProvider.mintToken is the
    // local stand-in for an approved device-flow grant.
    const token = (container.auth as MockAuthProvider).mintToken(developer.id);

    // --- Seed the advertiser campaign at the fixed CPM ----------------------
    const campaign = await container.campaigns.create({
      advertiserId: "settlement-advertiser",
      adText: "Settle the split",
      cpmCents: FIXED_CPM_CENTS,
    });

    // --- Fund the campaign via a SIMULATED, signed Stripe webhook (Req 11.2) -
    // Build a checkout.session.completed event, sign it with the mock gateway's
    // local HMAC secret, and POST it to the real webhook route handler.
    const fundingEvent: StripeEvent = {
      id: "evt_settlement_funding_1",
      type: "checkout.session.completed",
      campaignId: campaign.id,
      amountCents: FUNDING_AMOUNT_CENTS,
    };
    const gateway = container.payments as MockPaymentGateway;
    const { rawBody, signature } = gateway.signPayload(fundingEvent);
    const webhookRes = await stripeWebhookPost(
      new Request("http://in-process/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": signature },
        // Send the exact signed bytes. A plain Uint8Array view is a valid
        // BodyInit (a Node Buffer is not, per the DOM lib types) and preserves
        // the byte-exact payload the signature was computed over.
        body: new Uint8Array(rawBody),
      }),
    );
    expect(webhookRes.status).toBe(200);

    // Capture the durable pre-impression state.
    const campaignAfterFunding = await container.campaigns.getById(campaign.id);
    const developerBeforeImpression = await container.users.getById(
      developer.id,
    );
    expect(campaignAfterFunding?.budgetCents).toBe(FUNDING_AMOUNT_CENTS);
    const budgetBeforeCents = campaignAfterFunding?.budgetCents ?? 0;
    const balanceBeforeCents = developerBeforeImpression?.balanceCents ?? 0;

    // --- Serve the funded ad to this developer before tracking it ------------
    // The tracking route only accepts a campaign that was previously served to
    // the same developer, because `/api/ad` creates the per-developer pending
    // progress record used for cumulative viewability.
    const adRes = await adGet(
      new Request("http://in-process/api/ad", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(adRes.status).toBe(200);
    const adBody = (await adRes.json()) as {
      adAvailable: boolean;
      campaignId?: string;
    };
    expect(adBody).toMatchObject({
      adAvailable: true,
      campaignId: campaign.id,
    });

    // --- Record exactly ONE impression below the velocity limit (Req 11.3) --
    const trackRes = await trackPost(
      new Request("http://in-process/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          viewDurationMs: 3000,
        }),
      }),
    );
    expect(trackRes.status).toBe(200);
    const trackBody = (await trackRes.json()) as {
      recorded: boolean;
      developerCreditCents: number;
    };

    // Canonical expected split from @spinshare/core (single source of truth).
    const split: Split = computeSplit(FIXED_CPM_CENTS);
    const revenueCents = microcentsToCents(split.revenueMicrocents);
    const retentionCents = microcentsToCents(split.spinshareRetentionMicrocents);

    // The route's reported credit must equal the canonical 60% split.
    expect(trackBody.recorded).toBe(true);
    expect(trackBody.developerCreditCents).toBe(split.developerCreditCents);

    // Hot path defers durable writes to the flush — budget/balance unchanged
    // until reconciliation runs (demonstrates the Redis→Firestore separation).
    const budgetBeforeFlush = (await container.campaigns.getById(campaign.id))
      ?.budgetCents;
    const balanceBeforeFlush = (await container.users.getById(developer.id))
      ?.balanceCents;
    expect(budgetBeforeFlush).toBe(budgetBeforeCents);
    expect(balanceBeforeFlush).toBe(balanceBeforeCents);

    // --- Force a flush so the counter deltas land in the durable repos ------
    const flush = await runFlushCycle({
      counters: container.counters,
      ledger: container.ledger,
      users: container.users,
      campaigns: container.campaigns,
    });
    expect(flush.flushed).toBe(true);
    expect(flush.drained).toBe(1);

    // --- Read back the durable balances and assert the settlement -----------
    const developerAfter = await container.users.getById(developer.id);
    const campaignAfter = await container.campaigns.getById(campaign.id);
    const balanceAfterCents = developerAfter?.balanceCents ?? 0;
    const budgetAfterCents = campaignAfter?.budgetCents ?? 0;

    const balanceDeltaCents = balanceAfterCents - balanceBeforeCents;
    const budgetDecreaseCents = budgetBeforeCents - budgetAfterCents;

    // Req 11.4: developer balance increased by 60% of per-impression revenue.
    expectWithinOneCent(
      "Developer balance increase (60% of revenue)",
      revenueCents * 0.6,
      balanceDeltaCents,
    );

    // Req 11.5: campaign budget decreased by the FULL per-impression revenue.
    expectWithinOneCent(
      "Campaign budget decrease (full revenue)",
      revenueCents,
      budgetDecreaseCents,
    );

    // Req 11.6: SpinShare retention equals 40% of revenue ...
    expectWithinOneCent(
      "SpinShare retention (40% of revenue)",
      revenueCents * 0.4,
      retentionCents,
    );

    // ... and developer credit + retention equals the per-impression revenue
    // (conservation: no money created or lost).
    expectWithinOneCent(
      "Developer credit + SpinShare retention == revenue (conservation)",
      revenueCents,
      split.developerCreditCents + retentionCents,
    );

    // Exact micro-cent conservation as a belt-and-suspenders check.
    expect(
      split.developerCreditCents * MICROCENTS_PER_CENT +
        split.spinshareRetentionMicrocents,
    ).toBe(split.revenueMicrocents);
  });
});
