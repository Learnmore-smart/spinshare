import { type Campaign } from "@spinshare/core";

import { reconcilePaidCheckoutSession } from "@/server/checkout-reconciliation";
import { getContainer } from "@/server/container";
import type { AdvertiserActivity } from "@/server/ports/activity-repository";

export const dynamic = "force-dynamic";

type CheckoutStatus = "unknown" | "pending_webhook" | "funded";

interface CampaignStatusView {
  id: string;
  budgetCents: number;
  publicOnLeaderboard: boolean;
  biddable: boolean;
  leaderboardEligible: boolean;
}

function readSessionId(request: Request): string | null {
  const url = new URL(request.url);
  const raw =
    url.searchParams.get("checkout_session_id") ??
    url.searchParams.get("sessionId");
  const sessionId = raw?.trim();
  if (
    sessionId === undefined ||
    sessionId.length === 0 ||
    sessionId.length > 200 ||
    !/^cs_[A-Za-z0-9_]+$/.test(sessionId)
  ) {
    return null;
  }
  return sessionId;
}

function campaignStatusView(campaign: Campaign): CampaignStatusView {
  const biddable =
    campaign.status === "active" &&
    campaign.budgetCents > 0 &&
    campaign.cpmCents > 0;
  const publicOnLeaderboard = campaign.publicOnLeaderboard !== false;
  return {
    id: campaign.id,
    budgetCents: campaign.budgetCents,
    publicOnLeaderboard,
    biddable,
    leaderboardEligible: biddable && publicOnLeaderboard,
  };
}

function resolveCheckoutStatus(events: AdvertiserActivity[]): CheckoutStatus {
  if (events.some((event) => event.status === "budgetFunded")) {
    return "funded";
  }
  if (events.some((event) => event.status === "checkoutStarted")) {
    return "pending_webhook";
  }
  return "unknown";
}

function newestEvent(events: AdvertiserActivity[]): AdvertiserActivity | null {
  return [...events].sort((a, b) => b.createdAtMs - a.createdAtMs)[0] ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = readSessionId(request);
  if (sessionId === null) {
    return Response.json(
      { error: "invalid_checkout_session_id" },
      { status: 400 },
    );
  }

  const container = getContainer();
  const { activities, campaigns } = container;
  const events = await activities.listByCheckoutSessionId(sessionId);
  if (events.length === 0) {
    return Response.json(
      { sessionId, status: "unknown" satisfies CheckoutStatus },
      { status: 404 },
    );
  }

  const sourceEvent = newestEvent(events);
  let campaign =
    sourceEvent === null ? null : await campaigns.getById(sourceEvent.campaignId);
  let status = resolveCheckoutStatus(events);
  if (status !== "funded" && sourceEvent !== null) {
    const reconciled = await reconcilePaidCheckoutSession(
      container,
      sessionId,
      sourceEvent,
    );
    if (reconciled !== null) {
      campaign = reconciled;
      status = "funded";
    }
  }

  return Response.json(
    {
      sessionId,
      status,
      ...(campaign !== null ? { campaign: campaignStatusView(campaign) } : {}),
    },
    { status: 200 },
  );
}
