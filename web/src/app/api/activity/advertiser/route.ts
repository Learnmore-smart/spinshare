import { formatCentsAsUsd } from "@spinshare/core";

import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { getContainer } from "@/server/container";
import type {
  ActivityRecord,
  AuthClaims,
  ImpressionActivity,
} from "@/server/ports";
import { paginateActivity } from "../pagination";

export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

async function resolveClaims(request: Request): Promise<AuthClaims | null> {
  const token = extractBearerToken(request);
  if (token === null || token.length === 0) {
    return null;
  }
  const { auth } = getContainer();
  return auth.validateToken(token);
}

function toImpressionActivityView(activity: ImpressionActivity) {
  if (activity.status === "credited") {
    return null;
  }
  return {
    activityId: activity.activityId,
    campaignId: activity.campaignId,
    type: "impression_attempt",
    status: activity.status,
    viewDurationMs: activity.viewDurationMs,
    ...(activity.advertiserId !== undefined
      ? { advertiserId: activity.advertiserId }
      : {}),
    ...(activity.revenueMicrocents !== undefined
      ? { revenueMicrocents: activity.revenueMicrocents }
      : {}),
    ...(activity.developerCreditCents !== undefined
      ? {
          developerCreditCents: activity.developerCreditCents,
          developerCreditUsd: formatCentsAsUsd(activity.developerCreditCents),
        }
      : {}),
    createdAtMs: activity.createdAtMs,
  };
}

function isImpressionActivity(
  activity: ActivityRecord,
): activity is ImpressionActivity {
  return activity.type !== "advertiser_event" && activity.type !== "developer_event";
}

function toAdvertiserEventView(activity: ActivityRecord) {
  if (activity.type === "developer_event") {
    return null;
  }
  if (isImpressionActivity(activity)) {
    return toImpressionActivityView(activity);
  }
  return {
    activityId: activity.activityId,
    campaignId: activity.campaignId,
    type: "advertiser_event",
    status: activity.status,
    ...(activity.advertiserId !== undefined
      ? { advertiserId: activity.advertiserId }
      : {}),
    ...(activity.amountCents !== undefined
      ? { amountCents: activity.amountCents }
      : {}),
    ...(activity.amountMicrocents !== undefined
      ? { amountMicrocents: activity.amountMicrocents }
      : {}),
    ...(activity.amountUsd !== undefined ? { amountUsd: activity.amountUsd } : {}),
    ...(activity.providerEventId !== undefined
      ? { providerEventId: activity.providerEventId }
      : {}),
    ...(activity.checkoutSessionId !== undefined
      ? { checkoutSessionId: activity.checkoutSessionId }
      : {}),
    createdAtMs: activity.createdAtMs,
  };
}

export async function GET(request: Request): Promise<Response> {
  const claims = await resolveClaims(request);
  if (claims === null) {
    return unauthorized();
  }

  const { activities, campaigns } = getContainer();
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
  const campaignIds = [
    ...new Set(owned.map((campaign) => campaign.id)),
  ];
  const entries = await activities.listByCampaignIds(campaignIds);
  const page = paginateActivity(
    entries.map(toAdvertiserEventView).filter((entry) => entry !== null),
    request.url,
  );

  return Response.json(
    {
      activities: page.items,
      ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
    },
    { status: 200 },
  );
}
