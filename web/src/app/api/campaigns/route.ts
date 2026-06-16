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
  createCampaignSchema,
  formatCentsAsUsd,
} from "@spinshare/core";

import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { getContainer } from "@/server/container";
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

  // 3. Create the campaign owned by the advertiser, starting at zero budget
  //    (R9.1), and return it. Optional rich fields (destination URL, brand,
  //    leaderboard visibility) match the public homepage checkout form.
  const { campaigns } = getContainer();
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

  return Response.json(toCampaignView(campaign), { status: 201 });
}

export async function GET(request: Request): Promise<Response> {
  // 1. Authenticate; reject with 401 on a missing/invalid token.
  const claims = await resolveAdvertiserClaims(request);
  if (claims === null) {
    return unauthorized();
  }

  // 2. List the advertiser's campaigns with remaining budget + CPM (R9.5).
  const { campaigns, counters, ledger } = getContainer();
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
  const uniqueOwned = [...new Map(owned.map((campaign) => [campaign.id, campaign])).values()];
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
