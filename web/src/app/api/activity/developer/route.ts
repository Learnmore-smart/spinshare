import { formatCentsAsUsd } from "@spinshare/core";

import { getContainer } from "@/server/container";
import type { DeveloperActivityRecord } from "@/server/ports";
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

function toActivityView(activity: DeveloperActivityRecord) {
  if (activity.type === "developer_event") {
    return {
      activityId: activity.activityId,
      campaignId: activity.campaignId,
      type: "developer_event",
      status: activity.status,
      developerId: activity.developerId,
      ...(activity.amountCents !== undefined
        ? {
            amountCents: activity.amountCents,
            amountUsd:
              activity.amountUsd ?? formatCentsAsUsd(activity.amountCents),
          }
        : {}),
      ...(activity.providerEventId !== undefined
        ? { providerEventId: activity.providerEventId }
        : {}),
      ...(activity.providerStatus !== undefined
        ? { providerStatus: activity.providerStatus }
        : {}),
      ...(activity.providerCode !== undefined
        ? { providerCode: activity.providerCode }
        : {}),
      createdAtMs: activity.createdAtMs,
    };
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
    ...(activity.developerId !== undefined
      ? { developerId: activity.developerId }
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

export async function GET(request: Request): Promise<Response> {
  const token = extractBearerToken(request);
  if (token === null || token.length === 0) {
    return unauthorized();
  }

  const { activities, auth } = getContainer();
  const claims = await auth.validateToken(token);
  if (claims === null) {
    return unauthorized();
  }

  const entries = await activities.listByDeveloper(claims.userId);
  const page = paginateActivity(entries.map(toActivityView), request.url);
  return Response.json(
    {
      activities: page.items,
      ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
    },
    { status: 200 },
  );
}
