import { getContainer } from "@/server/container";
import { verifyClickToken } from "@/server/click-token";
import { destinationUrlSchema } from "@spinshare/core";

export const dynamic = "force-dynamic";

/** How long a redeemed click token id is remembered (>= the token's own TTL). */
const CLICK_CONSUME_TTL_SECONDS = 60 * 60;

function rootRedirect(request: Request): Response {
  return Response.redirect(new URL("/", request.url), 302);
}

function safeDestinationUrl(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const parsed = destinationUrlSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return new URL(parsed.data).toString();
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId")?.trim();
  const clickToken = url.searchParams.get("clickToken");
  if (!campaignId) {
    return rootRedirect(request);
  }

  try {
    const { campaigns, counters } = getContainer();
    const campaign = await campaigns.getById(campaignId);
    const destination = safeDestinationUrl(campaign?.destinationUrl);
    if (campaign === null || destination === null) {
      return rootRedirect(request);
    }

    const clickPayload = verifyClickToken(clickToken, { campaignId: campaign.id });
    if (clickPayload !== null) {
      // Single-use: count the click only on the FIRST redemption of this token.
      // A replayed token still redirects (UX preserved) but cannot inflate CTR.
      // Tokens minted before `jti` existed are counted (legacy fallback).
      let firstClick = true;
      if (clickPayload.jti) {
        try {
          firstClick = await counters.consumeOnce(
            `click:${clickPayload.jti}`,
            CLICK_CONSUME_TTL_SECONDS,
          );
        } catch {
          // Fail open: a counter-store blip should not drop a legitimate click.
          firstClick = true;
        }
      }
      if (firstClick) {
        try {
          await counters.incrementCampaignTelemetry(campaign.id, "clicks");
        } catch {
          // Click-through must still work if aggregate telemetry is unavailable.
        }
      }
    }

    return Response.redirect(destination, 302);
  } catch {
    return rootRedirect(request);
  }
}
