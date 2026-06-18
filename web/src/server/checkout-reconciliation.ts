import { formatCentsAsUsd, type Campaign } from "@spinshare/core";

import type { Container } from "./container";
import type {
  ActivityRecord,
  AdvertiserActivity,
} from "./ports/activity-repository";

function checkoutSessionFundingKey(sessionId: string): string {
  return `checkout_session:${sessionId}`;
}

function isAdvertiserActivity(
  activity: ActivityRecord,
): activity is AdvertiserActivity {
  return activity.type === "advertiser_event";
}

function checkoutSessionId(activity: AdvertiserActivity): string | null {
  const sessionId = activity.checkoutSessionId?.trim();
  return sessionId && sessionId.length > 0 ? sessionId : null;
}

export async function reconcilePaidCheckoutSession(
  container: Container,
  sessionId: string,
  sourceEvent: AdvertiserActivity,
): Promise<Campaign | null> {
  const funding = await container.payments
    .retrieveCheckoutSessionFunding(sessionId)
    .catch(() => null);
  if (
    funding === null ||
    funding.sessionId !== sessionId ||
    funding.status !== "paid" ||
    funding.campaignId !== sourceEvent.campaignId ||
    !Number.isSafeInteger(funding.amountCents) ||
    funding.amountCents <= 0
  ) {
    return null;
  }

  const campaign = await container.campaigns.getById(funding.campaignId);
  if (campaign === null) {
    return null;
  }

  const newlyApplied = await container.paymentEvents.markApplied(
    checkoutSessionFundingKey(sessionId),
    {
      campaignId: funding.campaignId,
      amountCents: funding.amountCents,
    },
  );
  if (newlyApplied) {
    await container.campaigns.applyBudgetDeltaCents(
      funding.campaignId,
      funding.amountCents,
    );
    await container.activities
      .record({
        activityId: `payment_checkout_session_${sessionId}`,
        campaignId: funding.campaignId,
        type: "advertiser_event",
        status: "budgetFunded",
        createdAtMs: Date.now(),
        advertiserId: campaign.advertiserId,
        amountCents: funding.amountCents,
        amountUsd: formatCentsAsUsd(funding.amountCents),
        providerEventId: checkoutSessionFundingKey(sessionId),
        checkoutSessionId: sessionId,
      })
      .catch(() => {});
  }

  return container.campaigns.getById(funding.campaignId);
}

export async function reconcilePaidCheckoutSessionsForCampaigns(
  container: Container,
  campaigns: readonly Campaign[],
): Promise<void> {
  const campaignIds = campaigns.map((campaign) => campaign.id);
  if (campaignIds.length === 0) {
    return;
  }

  const activities = await container.activities
    .listByCampaignIds(campaignIds)
    .catch(() => []);
  const alreadyFunded = new Set<string>();
  const pending = new Map<string, AdvertiserActivity>();

  for (const activity of activities) {
    if (!isAdvertiserActivity(activity)) {
      continue;
    }

    const sessionId = checkoutSessionId(activity);
    if (sessionId === null) {
      continue;
    }

    if (activity.status === "budgetFunded") {
      alreadyFunded.add(sessionId);
      pending.delete(sessionId);
      continue;
    }

    if (activity.status !== "checkoutStarted" || alreadyFunded.has(sessionId)) {
      continue;
    }

    const previous = pending.get(sessionId);
    if (previous === undefined || activity.createdAtMs > previous.createdAtMs) {
      pending.set(sessionId, activity);
    }
  }

  for (const [sessionId, activity] of pending) {
    await reconcilePaidCheckoutSession(container, sessionId, activity).catch(
      () => null,
    );
  }
}
