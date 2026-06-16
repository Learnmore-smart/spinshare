import { getContainer } from "@/server/container";
import { destinationUrlSchema } from "@spinshare/core";

export const dynamic = "force-dynamic";

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

    try {
      await counters.incrementCampaignTelemetry(campaign.id, "clicks");
    } catch {
      // Click-through must still work if aggregate telemetry is unavailable.
    }

    return Response.redirect(destination, 302);
  } catch {
    return rootRedirect(request);
  }
}
