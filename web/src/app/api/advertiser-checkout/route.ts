import {
  advertiserCheckoutSchema,
  formatCentsAsUsd,
  getAdvertiserCheckoutAmountCents,
} from "@spinshare/core";

import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import { getContainer, type Container } from "@/server/container";
import type { Campaign } from "@spinshare/core";

export const dynamic = "force-dynamic";

function fieldErrors(
  error: { issues: Array<{ path: Array<string | number>; message: string }> },
) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
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

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const parsed = advertiserCheckoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "invalid_request_body",
        details: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const amountCents = getAdvertiserCheckoutAmountCents(input);
  const purchasedImpressions = input.blockCount * 1_000;
  const container = getContainer();
  const { campaigns, payments } = container;
  const campaign = await campaigns.create({
    advertiserId: publicAdvertiserIdForEmail(input.email),
    contactEmail: input.email,
    adText: input.adText,
    destinationUrl: input.destinationUrl,
    brandName: input.brandName,
    brandIconDataUrl: input.brandIconDataUrl,
    publicOnLeaderboard: input.publicOnLeaderboard,
    cpmCents: input.cpmCents,
  });

  const origin = new URL(request.url).origin;
  const checkout = await payments.createCheckoutSession({
    campaignId: campaign.id,
    amountCents,
    purchasedImpressions,
    customerEmail: input.email,
    successUrl: `${origin}/?checkout=success&checkout_session_id={CHECKOUT_SESSION_ID}#bid-market`,
    cancelUrl: `${origin}/?checkout=cancelled#advertiser-checkout`,
  });
  const responseCampaign = { ...campaign };
  await recordCheckoutActivity(container, {
    campaign,
    status: "checkoutStarted",
    amountCents,
    checkoutSessionId: checkout.sessionId,
  });

  if (checkout.settled === true) {
    await campaigns.applyFunding(campaign.id, {
      amountCents,
      purchasedImpressions,
    });
    responseCampaign.budgetCents += amountCents;
    responseCampaign.purchasedImpressions =
      (responseCampaign.purchasedImpressions ?? 0) + purchasedImpressions;
    await recordCheckoutActivity(container, {
      campaign,
      status: "budgetFunded",
      amountCents,
      checkoutSessionId: checkout.sessionId,
    });
  }

  return Response.json(
    {
      ...checkout,
      amountCents,
      amountUsd: `$${formatCentsAsUsd(amountCents)}`,
      campaign: responseCampaign,
    },
    { status: 200 },
  );
}
