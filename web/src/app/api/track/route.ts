/**
 * `POST /api/track` — impression tracking / ledger endpoint.
 *
 * Records a single impression and returns the developer payout. The handler is
 * a thin HTTP adapter over the {@link recordImpression ledger service}: it
 * parses + Zod-validates the JSON body (including the 3-second minimum
 * `viewDurationMs` rule), extracts the bearer `Device_Auth_Token`, delegates
 * the money math + velocity/shadow-ban logic to the service (wired from the
 * composition-root {@link getContainer container}), and maps the typed result
 * to the `POST /api/track` API contract:
 *
 *   - `400 Bad Request` — malformed JSON or a body that fails
 *     {@link trackRequestSchema} (no mutation).
 *   - `401 Unauthorized` — missing/invalid token (no mutation, R2.9).
 *   - `422 Unprocessable Entity` — campaign missing or out of budget; body
 *     `{ error: "invalid_or_insufficient_campaign" }` (no mutation, R2.8).
 *   - `200 OK` — recorded (or shadow-banned, indistinguishable) with
 *     `{ recorded, developerCreditCents, developerCreditUsd }` (R2.7).
 *
 * See design "Ledger Engine" and the `POST /api/track` API contract.
 */

import {
  VIEWABILITY_MIN_MS,
  computeSplit,
  trackRequestSchema,
  type Campaign,
} from "@spinshare/core";

import { getContainer, type Container } from "@/server/container";
import {
  extractClientSignals,
  type ClientSignals,
} from "@/server/http/client-ip";
import {
  INVALID_CAMPAIGN_ERROR,
  UNAUTHORIZED_ERROR,
  recordImpression,
  type ImpressionSettlement,
} from "@/server/ledger-service";
import type {
  AuthClaims,
  ImpressionActivityStatus,
} from "@/server/ports";
import type {
  CampaignTelemetryMetric,
  CounterStore,
} from "@/server/ports/counter-store";

/** Always evaluate at request time; impression accounting is per request. */
export const dynamic = "force-dynamic";

/** Bearer prefix used by the `Authorization` header. */
const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the bearer `Device_Auth_Token` from an `Authorization: Bearer
 * <token>` header. Returns `null` when the header is absent or not a bearer
 * credential; the ledger service maps an absent/invalid token to `401`.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null) {
    return null;
  }
  if (!header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

function extractCampaignId(rawBody: unknown): string | null {
  if (rawBody === null || typeof rawBody !== "object") {
    return null;
  }
  const campaignId = (rawBody as { campaignId?: unknown }).campaignId;
  return typeof campaignId === "string" && campaignId.trim().length > 0
    ? campaignId
    : null;
}

function extractViewDurationMs(rawBody: unknown): number {
  if (rawBody === null || typeof rawBody !== "object") {
    return 0;
  }
  const value = (rawBody as { viewDurationMs?: unknown }).viewDurationMs;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nextActivityId(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `activity_${random}`;
}

function formatMicrocentsAsUsd(microcents: number): string {
  const dollars = Math.abs(microcents) / 100_000;
  const sign = microcents < 0 ? "-" : "";
  return `${sign}${dollars >= 0.01 ? dollars.toFixed(2) : dollars.toFixed(4)}`;
}

async function resolveActivityContext(
  container: Container,
  token: string | null,
  campaignId: string,
): Promise<{ claims: AuthClaims | null; campaign: Campaign | null }> {
  const [claims, campaign] = await Promise.all([
    token === null || token.length === 0
      ? Promise.resolve(null)
      : container.auth.validateToken(token).catch(() => null),
    container.campaigns.getById(campaignId).catch(() => null),
  ]);
  return { claims, campaign };
}

async function recordTrackActivity(
  container: Container,
  input: {
    campaignId: string;
    viewDurationMs: number;
    status: ImpressionActivityStatus;
    claims: AuthClaims | null;
    campaign: Campaign | null;
    developerCreditCents?: number;
    revenueMicrocents?: number;
    signals?: ClientSignals;
  },
): Promise<void> {
  try {
    await container.activities.record({
      activityId: nextActivityId(),
      campaignId: input.campaignId,
      status: input.status,
      viewDurationMs: input.viewDurationMs,
      createdAtMs: Date.now(),
      ...(input.campaign !== null
        ? { advertiserId: input.campaign.advertiserId }
        : {}),
      ...(input.claims !== null ? { developerId: input.claims.userId } : {}),
      ...(input.revenueMicrocents !== undefined
        ? { revenueMicrocents: input.revenueMicrocents }
        : {}),
      ...(input.developerCreditCents !== undefined
        ? { developerCreditCents: input.developerCreditCents }
        : {}),
      ...(input.signals?.ipHash ? { ipHash: input.signals.ipHash } : {}),
      ...(input.signals?.uaHash ? { uaHash: input.signals.uaHash } : {}),
    });
    if (
      input.status === "credited" &&
      input.campaign !== null &&
      input.revenueMicrocents !== undefined &&
      input.revenueMicrocents > 0
    ) {
      await container.activities.record({
        activityId: nextActivityId(),
        campaignId: input.campaignId,
        advertiserId: input.campaign.advertiserId,
        type: "advertiser_event",
        status: "budgetDebited",
        amountMicrocents: input.revenueMicrocents,
        amountUsd: formatMicrocentsAsUsd(input.revenueMicrocents),
        createdAtMs: Date.now(),
      });
    }
  } catch {
    // Activity history explains accounting but must not alter track responses.
  }
}

function telemetryMetricForSettlement(
  settlement: ImpressionSettlement,
): CampaignTelemetryMetric {
  switch (settlement) {
    case "credited":
      return "credited";
    case "shadowBanned":
      return "shadowBanned";
    case "earningCapped":
      return "earningCapped";
    case "duplicate":
      return "duplicate";
  }
}

async function recordCampaignTelemetry(
  counters: CounterStore,
  campaignId: string | null,
  metric: CampaignTelemetryMetric,
): Promise<void> {
  if (campaignId === null) {
    return;
  }
  try {
    await counters.incrementCampaignTelemetry(campaignId, metric);
  } catch {
    // Telemetry must never block the public tracking contract.
  }
}

async function recordInvalidBodyTelemetry(
  campaignId: string | null,
): Promise<void> {
  try {
    await recordCampaignTelemetry(getContainer().counters, campaignId, "tooShort");
  } catch {
    // Preserve the 400 response even if the counter backend is unavailable.
  }
}

function activityStatusForSettlement(
  settlement: ImpressionSettlement,
): ImpressionActivityStatus {
  return settlement;
}

function progressResponse(accumulatedViewDurationMs: number) {
  return {
    recorded: false,
    accumulatedViewDurationMs,
    remainingViewDurationMs: Math.max(
      0,
      VIEWABILITY_MIN_MS - accumulatedViewDurationMs,
    ),
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + Zod-validate the body. Malformed JSON and schema violations both
  //    surface as 400 with no mutation.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  // Capture privacy-preserving network signals once for every activity row this
  // request writes (anti-fraud: per-IP fan-out / velocity clustering).
  const clientSignals = extractClientSignals(request);

  const token = extractBearerToken(request);
  const parsed = trackRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const campaignId = extractCampaignId(rawBody);
    await recordInvalidBodyTelemetry(campaignId);
    const viewDurationMs = extractViewDurationMs(rawBody);
    if (campaignId !== null && viewDurationMs > 0 && viewDurationMs < 3000) {
      const container = getContainer();
      const { claims, campaign } = await resolveActivityContext(
        container,
        token,
        campaignId,
      );
      await recordTrackActivity(container, {
        campaignId,
        viewDurationMs,
        status: "tooShort",
        claims,
        campaign,
        developerCreditCents: 0,
        revenueMicrocents: 0,
        signals: clientSignals,
      });
    }
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "invalid_request_body" },
      { status: 400 },
    );
  }

  // 2. Validate auth/campaign for cumulative progress. Short valid segments are
  //    remembered; only cumulative >= 3s delegates to the ledger service.
  const container = getContainer();
  const { auth, campaigns, counters, progress } = container;
  const activityContext = await resolveActivityContext(
    container,
    token,
    parsed.data.campaignId,
  );
  if (activityContext.claims === null) {
    await recordTrackActivity(container, {
      campaignId: parsed.data.campaignId,
      viewDurationMs: parsed.data.viewDurationMs,
      status: "invalidToken",
      claims: null,
      campaign: activityContext.campaign,
      developerCreditCents: 0,
      revenueMicrocents: 0,
      signals: clientSignals,
    });
    await recordCampaignTelemetry(
      counters,
      parsed.data.campaignId,
      "invalidToken",
    );
    return Response.json({ error: UNAUTHORIZED_ERROR }, { status: 401 });
  }
  if (
    activityContext.campaign === null ||
    activityContext.campaign.budgetCents <= 0
  ) {
    await recordTrackActivity(container, {
      campaignId: parsed.data.campaignId,
      viewDurationMs: parsed.data.viewDurationMs,
      status: "invalidCampaign",
      claims: activityContext.claims,
      campaign: activityContext.campaign,
      developerCreditCents: 0,
      revenueMicrocents: 0,
      signals: clientSignals,
    });
    await recordCampaignTelemetry(
      counters,
      parsed.data.campaignId,
      "invalidCampaign",
    );
    return Response.json(
      { error: INVALID_CAMPAIGN_ERROR },
      { status: 422 },
    );
  }

  const servedProgress = await progress.getByDeveloper(
    activityContext.claims.userId,
  );
  if (
    servedProgress === null ||
    servedProgress.campaignId !== parsed.data.campaignId
  ) {
    await recordTrackActivity(container, {
      campaignId: parsed.data.campaignId,
      viewDurationMs: parsed.data.viewDurationMs,
      status: "invalidCampaign",
      claims: activityContext.claims,
      campaign: activityContext.campaign,
      developerCreditCents: 0,
      revenueMicrocents: 0,
      signals: clientSignals,
    });
    await recordCampaignTelemetry(
      counters,
      parsed.data.campaignId,
      "invalidCampaign",
    );
    return Response.json(
      { error: INVALID_CAMPAIGN_ERROR },
      { status: 422 },
    );
  }

  const nowMs = Date.now();
  const progressRecord = await progress.addDuration({
    developerId: activityContext.claims.userId,
    campaignId: parsed.data.campaignId,
    viewDurationMs: parsed.data.viewDurationMs,
    nowMs,
  });

  // Server-clocked viewability: the client-reported viewDurationMs is advisory.
  // The real gate is wall-clock elapsed since `/api/ad` stamped servedAtMs, which
  // a scripter POSTing viewDurationMs:3000 in a tight loop cannot forge. Require
  // BOTH the cumulative client duration AND the server dwell to reach 3s. When
  // servedAtMs is absent (legacy records / pre-serve), fall back to the
  // client-only gate so older flows are not silently broken.
  const serverDwellMs =
    servedProgress.servedAtMs !== undefined
      ? nowMs - servedProgress.servedAtMs
      : null;
  const viewable =
    progressRecord.accumulatedViewDurationMs >= VIEWABILITY_MIN_MS &&
    (serverDwellMs === null || serverDwellMs >= VIEWABILITY_MIN_MS);

  if (!viewable) {
    await recordTrackActivity(container, {
      campaignId: parsed.data.campaignId,
      viewDurationMs: progressRecord.accumulatedViewDurationMs,
      status: "tooShort",
      claims: activityContext.claims,
      campaign: activityContext.campaign,
      developerCreditCents: 0,
      revenueMicrocents: 0,
      signals: clientSignals,
    });
    await recordCampaignTelemetry(counters, parsed.data.campaignId, "tooShort");
    return Response.json(
      progressResponse(progressRecord.accumulatedViewDurationMs),
      { status: 200 },
    );
  }

  // 3. Delegate to the ledger service with the composition-root providers once
  //    cumulative viewability reaches the settlement threshold.
  const result = await recordImpression(
    { auth, campaigns, counters },
    { token, campaignId: parsed.data.campaignId },
  );
  await progress.clearDeveloper(activityContext.claims.userId);

  // 4. Map the typed result to the HTTP contract.
  if (result.ok) {
    const status = activityStatusForSettlement(result.settlement);
    const split =
      result.settlement === "credited" && activityContext.campaign !== null
        ? computeSplit(activityContext.campaign.cpmCents)
        : null;
    await recordTrackActivity(container, {
      campaignId: parsed.data.campaignId,
      viewDurationMs: progressRecord.accumulatedViewDurationMs,
      status,
      claims: activityContext.claims,
      campaign: activityContext.campaign,
      developerCreditCents:
        result.settlement === "credited" && result.response.recorded === true
          ? result.response.developerCreditCents
          : 0,
      revenueMicrocents: split?.revenueMicrocents ?? 0,
      signals: clientSignals,
    });
    await recordCampaignTelemetry(
      counters,
      parsed.data.campaignId,
      telemetryMetricForSettlement(result.settlement),
    );
    return Response.json(result.response, { status: 200 });
  }
  await recordTrackActivity(container, {
    campaignId: parsed.data.campaignId,
    viewDurationMs: progressRecord.accumulatedViewDurationMs,
    status: result.status === 401 ? "invalidToken" : "invalidCampaign",
    claims: activityContext.claims,
    campaign: activityContext.campaign,
    developerCreditCents: 0,
    revenueMicrocents: 0,
    signals: clientSignals,
  });
  await recordCampaignTelemetry(
    counters,
    parsed.data.campaignId,
    result.status === 401 ? "invalidToken" : "invalidCampaign",
  );
  return Response.json({ error: result.error }, { status: result.status });
}
