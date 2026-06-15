import { createHash } from "node:crypto";

import {
  advertiserCheckoutSchema,
  formatCentsAsUsd,
  getAdvertiserCheckoutAmountCents,
} from "@spinshare/core";

import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

function advertiserIdForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 32);
  return `public_${digest}`;
}

function fieldErrors(
  error: { issues: Array<{ path: Array<string | number>; message: string }> },
) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
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
  const { campaigns, payments } = getContainer();
  const campaign = await campaigns.create({
    advertiserId: advertiserIdForEmail(input.email),
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
    customerEmail: input.email,
    successUrl: `${origin}/?checkout=success#bid-market`,
    cancelUrl: `${origin}/?checkout=cancelled#advertiser-checkout`,
  });
  const responseCampaign = { ...campaign };

  if (checkout.settled === true) {
    await campaigns.applyBudgetDeltaCents(campaign.id, amountCents);
    responseCampaign.budgetCents += amountCents;
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
