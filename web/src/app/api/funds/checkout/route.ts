/**
 * `/api/funds/checkout` — start a Stripe checkout session to fund a campaign.
 *
 * Thin HTTP adapter over the {@link PaymentGateway} (wired from the
 * composition-root {@link getContainer container}). Authenticates the caller
 * via the bearer `Device_Auth_Token` and resolves the advertiser identity from
 * {@link AuthProvider.validateToken}.
 *
 *   - `POST /api/funds/checkout` — body `{ campaignId, amountCents }` validated
 *     by the core {@link fundingAmountSchema} (amount 100–10000000 cents,
 *     one-cent precision). On a valid amount in range it starts a hosted
 *     checkout session and returns `200 { url, sessionId }` (R9.6). When the
 *     amount is below $1.00, above $100,000.00, non-integer (sub-cent), or
 *     non-numeric, it returns `400 { error, details }` and SHALL NOT start a
 *     checkout session (R9.7).
 *
 * `401 Unauthorized` is returned when the token is missing or invalid (no
 * checkout session is started). See design "Campaign & Funding".
 */

import {
  FUNDING_CENTS_MAX,
  formatCentsAsUsd,
  fundingBlockCheckoutSchema,
  getAdvertiserCheckoutAmountCents,
  type Campaign,
} from "@spinshare/core";

import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { creditCampaignBudgetWithReview } from "@/server/campaign-review";
import { getContainer, type Container } from "@/server/container";
import type { AuthClaims } from "@/server/ports/auth-provider";

/** Always evaluate at request time; funding is a live, per-advertiser action. */
export const dynamic = "force-dynamic";

/** Bearer prefix used by the `Authorization` header. */
const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the bearer `Device_Auth_Token` from an `Authorization: Bearer
 * <token>` header. Returns `null` when the header is absent or not a bearer
 * credential.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * Resolves the authenticated claims from the request's bearer token, or `null`
 * when the token is missing/invalid.
 */
async function resolveAdvertiserClaims(
  request: Request,
): Promise<AuthClaims | null> {
  const token = extractBearerToken(request);
  if (token === null || token.length === 0) {
    return null;
  }
  const { auth } = getContainer();
  return auth.validateToken(token);
}

function getAllowedAdvertiserIds(claims: AuthClaims): Set<string> {
  const ids = new Set<string>([claims.userId]);
  if (claims.email !== undefined && claims.email.trim().length > 0) {
    ids.add(publicAdvertiserIdForEmail(claims.email));
  }
  return ids;
}

/** Standard `401` response body; no checkout session has been started. */
function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

async function recordFundingActivity(
  container: Container,
  input: {
    campaign: Campaign;
    status: "checkoutStarted" | "budgetFunded";
    amountCents: number;
    checkoutSessionId: string;
  },
): Promise<void> {
  try {
    await container.activities.record({
      activityId: `${input.status}_${input.checkoutSessionId}`,
      campaignId: input.campaign.id,
      advertiserId: input.campaign.advertiserId,
      type: "advertiser_event",
      status: input.status,
      amountCents: input.amountCents,
      amountUsd: formatCentsAsUsd(input.amountCents),
      checkoutSessionId: input.checkoutSessionId,
      createdAtMs: Date.now(),
    });
  } catch {
    // Activity history must not block checkout or mock funding.
  }
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate; reject with 401 (no session) on a missing/invalid token.
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }
  const allowedAdvertiserIds = getAllowedAdvertiserIds(claims);

  // 2. Parse + validate the body via the core schema. Malformed JSON and schema
  //    violations (amount <$1.00, >$100,000.00, sub-cent, or non-numeric) both
  //    surface as 400; no checkout session is started (R9.7).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const parsed = fundingBlockCheckoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      {
        error: issue?.message ?? "invalid_request_body",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // 3. Ensure the requested campaign exists and is owned by this advertiser.
  const container = getContainer();
  const { campaigns, payments } = container;
  const campaign = await campaigns.getById(parsed.data.campaignId);
  if (campaign === null) {
    return Response.json({ error: "campaign_not_found" }, { status: 404 });
  }
  if (!allowedAdvertiserIds.has(campaign.advertiserId)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Buy-time CPM edit: when the advertiser sets a new max CPM in the buy
  // control, re-price this checkout off it and persist it for future bids.
  // When omitted, fall back to the campaign's existing CPM (the UI defaults the
  // input placeholder to it, so an empty field means "keep current").
  const effectiveCpmCents = parsed.data.cpmCents ?? campaign.cpmCents;
  if (
    parsed.data.cpmCents !== undefined &&
    parsed.data.cpmCents !== campaign.cpmCents
  ) {
    await campaigns.update(campaign.id, { cpmCents: parsed.data.cpmCents });
    campaign.cpmCents = parsed.data.cpmCents;
  }

  const amountCents = getAdvertiserCheckoutAmountCents({
    cpmCents: effectiveCpmCents,
    blockCount: parsed.data.blockCount,
  });
  const purchasedImpressions = parsed.data.blockCount * 1_000;
  if (!Number.isSafeInteger(amountCents) || amountCents > FUNDING_CENTS_MAX) {
    return Response.json(
      { error: "Total checkout amount must be between $1.00 and $100,000.00" },
      { status: 400 },
    );
  }

  // 4. Start the hosted checkout session for the validated amount (R9.6).
  const origin = new URL(request.url).origin;
  const checkout = await payments.createCheckoutSession({
    campaignId: parsed.data.campaignId,
    amountCents,
    purchasedImpressions,
    successUrl: `${origin}/dashboard/advertiser?funding=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/dashboard/advertiser?funding=cancelled`,
  });

  const responseCampaign = { ...campaign };
  await recordFundingActivity(container, {
    campaign,
    status: "checkoutStarted",
    amountCents,
    checkoutSessionId: checkout.sessionId,
  });

  if (checkout.settled === true) {
    // Pay-then-review: first funding gates the campaign through review before it
    // can bid (see creditCampaignBudgetWithReview).
    responseCampaign.reviewStatus = await creditCampaignBudgetWithReview(
      campaigns,
      campaign,
      { amountCents, purchasedImpressions },
    );
    responseCampaign.budgetCents += amountCents;
    responseCampaign.purchasedImpressions =
      (responseCampaign.purchasedImpressions ?? 0) + purchasedImpressions;
    await recordFundingActivity(container, {
      campaign,
      status: "budgetFunded",
      amountCents,
      checkoutSessionId: checkout.sessionId,
    });
  }

  return Response.json(
    { ...checkout, campaign: responseCampaign },
    { status: 200 },
  );
}
