/**
 * `/api/campaigns` — advertiser campaign management endpoint.
 *
 * Thin HTTP adapter over the {@link CampaignRepository} (wired from the
 * composition-root {@link getContainer container}). Both verbs authenticate the
 * caller via the bearer `Device_Auth_Token` and resolve the advertiser identity
 * from {@link AuthProvider.validateToken}'s `userId` claim (R9.* are scoped to
 * an authenticated advertiser).
 *
 *   - `POST /api/campaigns` — body `{ adText, cpmCents }` validated by the core
 *     {@link createCampaignSchema} (adText 1–60 non-whitespace chars, cpmCents
 *     1–100000). On success creates a campaign starting at `budgetCents = 0`
 *     and returns `201` with the created {@link Campaign} (R9.1). On a field
 *     violation returns `400 { error, details }` carrying the first field-level
 *     message and SHALL NOT create a campaign (R9.2, R9.3, R9.4).
 *   - `GET /api/campaigns` — returns `200` with the advertiser's campaigns, each
 *     enriched with its remaining budget and CPM as USD display strings (R9.5).
 *
 * `401 Unauthorized` is returned by either verb when the token is missing or
 * invalid (no mutation). See design "Campaign & Funding".
 */

import {
  type Campaign,
  FUNDING_CENTS_MAX,
  createCampaignSchema,
  formatCentsAsUsd,
  getAdvertiserCheckoutAmountCents,
  updateCampaignSchema,
} from "@spinshare/core";

import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import {
  creditCampaignBudgetWithReview,
  reviewCampaignContent,
} from "@/server/campaign-review";
import { reconcilePaidCheckoutSessionsForCampaigns } from "@/server/checkout-reconciliation";
import { getContainer, type Container } from "@/server/container";
import type {
  CampaignRepository,
  CampaignUpdate,
} from "@/server/ports/campaign-repository";
import { flushPendingForRead } from "@/server/flush-before-read";
import type { CounterStore, LedgerRepository } from "@/server/ports";
import type { AuthClaims } from "@/server/ports/auth-provider";
import {
  type CampaignTelemetry,
  zeroCampaignTelemetry,
} from "@/server/ports/counter-store";

/** Always evaluate at request time; campaign data is per-advertiser and live. */
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
 * Resolves the authenticated advertiser id from the request's bearer token, or
 * `null` when the token is missing/invalid. Centralizes the `401` decision for
 * both verbs.
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

/** Standard `401` response body; no mutation has occurred. */
function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * The set of advertiser ids the caller may act on: their auth `userId` plus the
 * deterministic public-checkout id derived from their email, so a campaign
 * created via the homepage form is editable from the signed-in dashboard.
 */
function allowedAdvertiserIds(claims: AuthClaims): Set<string> {
  const ids = new Set<string>([claims.userId]);
  if (claims.email !== undefined && claims.email.trim().length > 0) {
    ids.add(publicAdvertiserIdForEmail(claims.email));
  }
  return ids;
}

async function recordCheckoutActivity(
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
    // Activity history must not block checkout creation or mock settlement.
  }
}

/**
 * Enriches a {@link Campaign} with USD display strings for its remaining budget
 * and CPM so the advertiser dashboard can render without re-deriving money math.
 */
function toCampaignView(
  campaign: Campaign,
  telemetry: CampaignTelemetry = zeroCampaignTelemetry(),
  durableImpressions = 0,
): Campaign & {
  cpmUsd: string;
  remainingBudgetUsd: string;
  telemetry: CampaignTelemetry;
} {
  const normalizedTelemetry = {
    ...zeroCampaignTelemetry(),
    ...telemetry,
    credited: Math.max(telemetry.credited, durableImpressions),
  };
  return {
    ...campaign,
    cpmUsd: formatCentsAsUsd(campaign.cpmCents),
    remainingBudgetUsd: formatCentsAsUsd(campaign.budgetCents),
    telemetry: normalizedTelemetry,
  };
}

async function readCampaignTelemetry(
  counters: CounterStore,
  campaignIds: string[],
): Promise<Record<string, CampaignTelemetry>> {
  try {
    return await counters.getCampaignTelemetry(campaignIds);
  } catch {
    return Object.fromEntries(
      campaignIds.map((id) => [id, zeroCampaignTelemetry()]),
    );
  }
}

async function readDurableImpressions(
  ledger: LedgerRepository,
  campaignIds: string[],
): Promise<Record<string, number>> {
  try {
    return await ledger.countByCampaignIds(campaignIds);
  } catch {
    return Object.fromEntries(campaignIds.map((id) => [id, 0]));
  }
}

async function deleteCampaignRecord(
  campaigns: CampaignRepository,
  campaignId: string,
): Promise<void> {
  const maybeDelete = (campaigns as { delete?: unknown }).delete;
  if (typeof maybeDelete === "function") {
    await maybeDelete.call(campaigns, campaignId);
    return;
  }

  const maybeMemoryStore = (campaigns as { campaigns?: unknown }).campaigns;
  if (maybeMemoryStore instanceof Map) {
    if (!maybeMemoryStore.delete(campaignId)) {
      throw new Error(`campaign not found: ${campaignId}`);
    }
    return;
  }

  const maybeCollection = (campaigns as {
    collection?: { doc?: (id: string) => { delete: () => Promise<void> } };
  }).collection;
  if (maybeCollection && typeof maybeCollection.doc === "function") {
    await maybeCollection.doc(campaignId).delete();
    return;
  }

  throw new Error("campaign repository does not support delete");
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate; reject with 401 (no mutation) on a missing/invalid token.
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }
  const advertiserId = claims.userId;

  // 2. Parse + validate the body via the core schema. Malformed JSON and schema
  //    violations both surface as 400 with the field-level message; no campaign
  //    is created (R9.2, R9.3, R9.4).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(rawBody);
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

  const directCheckoutAmountCents =
    parsed.data.blockCount !== undefined
      ? getAdvertiserCheckoutAmountCents({
          cpmCents: parsed.data.cpmCents,
          blockCount: parsed.data.blockCount,
        })
      : null;
  if (
    directCheckoutAmountCents !== null &&
    (!Number.isSafeInteger(directCheckoutAmountCents) ||
      directCheckoutAmountCents > FUNDING_CENTS_MAX)
  ) {
    return Response.json(
      { error: "Total checkout amount must be between $1.00 and $100,000.00" },
      { status: 400 },
    );
  }

  // 3. Create the campaign owned by the advertiser, starting at zero budget
  //    (R9.1), and return it. Optional rich fields (destination URL, brand,
  //    leaderboard visibility) match the public homepage checkout form.
  const container = getContainer();
  const { campaigns, payments } = container;
  const campaign = await campaigns.create({
    advertiserId,
    adText: parsed.data.adText,
    cpmCents: parsed.data.cpmCents,
    ...(parsed.data.destinationUrl !== undefined
      ? { destinationUrl: parsed.data.destinationUrl }
      : {}),
    ...(parsed.data.brandName !== undefined
      ? { brandName: parsed.data.brandName }
      : {}),
    ...(parsed.data.brandIconDataUrl !== undefined
      ? { brandIconDataUrl: parsed.data.brandIconDataUrl }
      : {}),
    ...(parsed.data.publicOnLeaderboard !== undefined
      ? { publicOnLeaderboard: parsed.data.publicOnLeaderboard }
      : {}),
  });

  if (directCheckoutAmountCents === null) {
    return Response.json(toCampaignView(campaign), { status: 201 });
  }

  const origin = new URL(request.url).origin;
  const checkout = await payments.createCheckoutSession({
    campaignId: campaign.id,
    amountCents: directCheckoutAmountCents,
    successUrl: `${origin}/dashboard/advertiser?funding=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/dashboard/advertiser?funding=cancelled&fund=${encodeURIComponent(campaign.id)}`,
  });
  const responseCampaign = { ...campaign };
  await recordCheckoutActivity(container, {
    campaign,
    status: "checkoutStarted",
    amountCents: directCheckoutAmountCents,
    checkoutSessionId: checkout.sessionId,
  });

  if (checkout.settled === true) {
    // Pay-then-review: crediting a campaign's first budget parks it in review
    // before it can bid (see creditCampaignBudgetWithReview).
    responseCampaign.reviewStatus = await creditCampaignBudgetWithReview(
      campaigns,
      campaign,
      directCheckoutAmountCents,
    );
    responseCampaign.budgetCents += directCheckoutAmountCents;
    await recordCheckoutActivity(container, {
      campaign,
      status: "budgetFunded",
      amountCents: directCheckoutAmountCents,
      checkoutSessionId: checkout.sessionId,
    });
  }

  return Response.json(
    {
      ...checkout,
      amountCents: directCheckoutAmountCents,
      amountUsd: `$${formatCentsAsUsd(directCheckoutAmountCents)}`,
      campaign: toCampaignView(responseCampaign),
    },
    { status: 201 },
  );
}

export async function GET(request: Request): Promise<Response> {
  // 1. Authenticate; reject with 401 on a missing/invalid token.
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }

  // 2. Reconcile pending impressions before reading advertiser-facing budget
  //    and credited totals. This keeps the dashboard aligned with recent ads.
  const container = getContainer();
  await flushPendingForRead(container, "advertiser-campaigns");
  const { campaigns, counters, ledger } = container;
  const advertiserIds = new Set([claims.userId]);
  if (claims.email !== undefined && claims.email.trim().length > 0) {
    advertiserIds.add(publicAdvertiserIdForEmail(claims.email));
  }
  const owned = (
    await Promise.all(
      [...advertiserIds].map((advertiserId) =>
        campaigns.listByAdvertiser(advertiserId),
      ),
    )
  ).flat();
  let uniqueOwned = [...new Map(owned.map((campaign) => [campaign.id, campaign])).values()];
  await reconcilePaidCheckoutSessionsForCampaigns(container, uniqueOwned);
  if (uniqueOwned.length > 0) {
    const refreshed = (
      await Promise.all(
        [...advertiserIds].map((advertiserId) =>
          campaigns.listByAdvertiser(advertiserId),
        ),
      )
    ).flat();
    uniqueOwned = [
      ...new Map(refreshed.map((campaign) => [campaign.id, campaign])).values(),
    ];
  }
  const campaignIds = uniqueOwned.map((campaign) => campaign.id);
  const [telemetry, durableImpressions] = await Promise.all([
    readCampaignTelemetry(counters, campaignIds),
    readDurableImpressions(ledger, campaignIds),
  ]);

  return Response.json(
    {
      campaigns: uniqueOwned.map((campaign) =>
        toCampaignView(
          campaign,
          telemetry[campaign.id],
          durableImpressions[campaign.id] ?? 0,
        ),
      ),
    },
    { status: 200 },
  );
}

/**
 * `PATCH /api/campaigns` — edit an existing campaign the caller owns.
 *
 * Body: `{ campaignId, ...editableFields }` where editable fields are validated
 * by {@link updateCampaignSchema} (adText, destinationUrl, brandName,
 * brandIconDataUrl, publicOnLeaderboard, cpmCents — all optional). At least one
 * field must change. When ad text or destination changes the content is re-run
 * through {@link reviewCampaignContent} and the resulting `reviewStatus` is
 * persisted in the same write (the "edit → re-review" half of pay-then-review).
 *
 *   - `401` missing/invalid token · `404` unknown campaign · `403` not the owner
 *   - `400` malformed JSON, schema violation, or an empty patch
 *   - `200` with the updated {@link Campaign} view on success
 */
export async function PATCH(request: Request): Promise<Response> {
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }
  if (typeof rawBody !== "object" || rawBody === null) {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }
  const { campaignId, ...fields } = rawBody as Record<string, unknown>;
  if (typeof campaignId !== "string" || campaignId.trim().length === 0) {
    return Response.json({ error: "Campaign id is required" }, { status: 400 });
  }

  const parsed = updateCampaignSchema.safeParse(fields);
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

  // Build the patch from only the keys the advertiser actually provided.
  const patch: CampaignUpdate = {};
  if (parsed.data.adText !== undefined) patch.adText = parsed.data.adText;
  if (parsed.data.destinationUrl !== undefined)
    patch.destinationUrl = parsed.data.destinationUrl;
  if (parsed.data.brandName !== undefined) patch.brandName = parsed.data.brandName;
  if (parsed.data.brandIconDataUrl !== undefined)
    patch.brandIconDataUrl = parsed.data.brandIconDataUrl;
  if (parsed.data.publicOnLeaderboard !== undefined)
    patch.publicOnLeaderboard = parsed.data.publicOnLeaderboard;
  if (parsed.data.cpmCents !== undefined) patch.cpmCents = parsed.data.cpmCents;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const container = getContainer();
  const { campaigns } = container;
  const existing = await campaigns.getById(campaignId);
  if (existing === null) {
    return Response.json({ error: "campaign_not_found" }, { status: 404 });
  }
  if (!allowedAdvertiserIds(claims).has(existing.advertiserId)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Re-gate content edits through the review seam (pay-then-review / edit path).
  if (patch.adText !== undefined || patch.destinationUrl !== undefined) {
    const review = await reviewCampaignContent({
      adText: patch.adText ?? existing.adText,
      destinationUrl: patch.destinationUrl ?? existing.destinationUrl,
    });
    patch.reviewStatus = review.status;
  }

  const updated = await campaigns.update(campaignId, patch);
  return Response.json(toCampaignView(updated), { status: 200 });
}

/**
 * `DELETE /api/campaigns` permanently removes an owned unpaid campaign.
 *
 * The UI only exposes this for never-funded cards; the route also protects the
 * storage boundary by rejecting campaigns with remaining budget or activity.
 */
export async function DELETE(request: Request): Promise<Response> {
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }
  if (typeof rawBody !== "object" || rawBody === null) {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }
  const { campaignId } = rawBody as Record<string, unknown>;
  if (typeof campaignId !== "string" || campaignId.trim().length === 0) {
    return Response.json({ error: "Campaign id is required" }, { status: 400 });
  }

  const container = getContainer();
  const { campaigns, counters, ledger } = container;
  const existing = await campaigns.getById(campaignId);
  if (existing === null) {
    return Response.json({ error: "campaign_not_found" }, { status: 404 });
  }
  if (!allowedAdvertiserIds(claims).has(existing.advertiserId)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (existing.budgetCents > 0) {
    return Response.json({ error: "campaign_has_budget" }, { status: 409 });
  }

  const [telemetry, durableImpressions] = await Promise.all([
    readCampaignTelemetry(counters, [campaignId]),
    readDurableImpressions(ledger, [campaignId]),
  ]);
  const campaignTelemetry = telemetry[campaignId] ?? zeroCampaignTelemetry();
  if (
    campaignTelemetry.shows > 0 ||
    campaignTelemetry.credited > 0 ||
    (durableImpressions[campaignId] ?? 0) > 0
  ) {
    return Response.json({ error: "campaign_has_activity" }, { status: 409 });
  }

  await deleteCampaignRecord(campaigns, campaignId);
  return Response.json({ deleted: true, campaignId });
}
