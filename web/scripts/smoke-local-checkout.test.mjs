import { describe, expect, it } from "vitest";

import {
  isPurchasedCampaignActivityResponse,
  isPurchasedCampaignAdResponse,
  isPurchasedCampaignDashboardResponse,
  isPurchasedCampaignMarketResponse,
  isPurchasedCheckoutResponse,
  summarizePurchasedCampaignActivity,
  summarizePurchasedCampaignAd,
  summarizePurchasedCampaignDashboard,
  summarizePurchasedCampaignMarket,
  summarizePurchasedCheckout,
} from "./smoke-local-checkout.mjs";

const campaignId = "cmp_checkout_smoke";
const sessionId = "cs_checkout_smoke";

const checkout = {
  settled: true,
  sessionId,
  url: "http://127.0.0.1:3000/?checkout=success",
  amountCents: 5000,
  amountUsd: "$50.00",
  campaign: {
    id: campaignId,
    adText: "SpinShare Checkout Smoke - funded local purchase",
    destinationUrl: "https://www.spinshare.dev/checkout-smoke",
    brandName: "Checkout Smoke",
    cpmCents: 5000,
    budgetCents: 5000,
    publicOnLeaderboard: true,
    status: "active",
  },
};

const market = {
  rows: [
    {
      id: campaignId,
      rank: 1,
      adText: "SpinShare Checkout Smoke - funded local purchase",
      bidLabel: "$50.00 / 1k imps",
      cpmCents: 5000,
      remainingBudgetCents: 5000,
      remainingBudgetUsd: "$50.00",
      servedImpressions: 0,
      targetImpressions: 1000,
      status: "live",
    },
    {
      id: "cmp-local-demo",
      rank: 2,
      adText: "SpinShare Local - sample ad for localhost testing",
      bidLabel: "$30.00 / 1k imps",
      cpmCents: 3000,
      remainingBudgetCents: 5000,
      remainingBudgetUsd: "$50.00",
      servedImpressions: 0,
      targetImpressions: 1666,
      status: "live",
    },
  ],
  summary: {
    liveCampaigns: 2,
    topCpmCents: 5000,
    topCpmUsd: "$50.00",
  },
};

const ad = {
  adAvailable: true,
  campaignId,
  adText: "SpinShare Checkout Smoke - funded local purchase",
  destinationUrl:
    "http://127.0.0.1:3000/api/click?campaignId=cmp_checkout_smoke&clickToken=token",
  brandName: "Checkout Smoke",
  cpmCents: 5000,
  cpmUsd: "50.00",
};

const dashboard = {
  campaigns: [
    {
      id: campaignId,
      adText: "SpinShare Checkout Smoke - funded local purchase",
      brandName: "Checkout Smoke",
      budgetCents: 5000,
      cpmCents: 5000,
      publicOnLeaderboard: true,
      telemetry: {
        shows: 1,
        credited: 0,
        clicks: 0,
        tooShort: 0,
        invalidToken: 0,
        invalidCampaign: 0,
        shadowBanned: 0,
        earningCapped: 0,
        duplicate: 0,
      },
    },
  ],
};

const activity = {
  activities: [
    {
      activityId: `checkoutStarted_${sessionId}`,
      campaignId,
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 5000,
      checkoutSessionId: sessionId,
      createdAtMs: 1,
    },
    {
      activityId: `budgetFunded_${sessionId}`,
      campaignId,
      type: "advertiser_event",
      status: "budgetFunded",
      amountCents: 5000,
      checkoutSessionId: sessionId,
      createdAtMs: 2,
    },
  ],
};

describe("local checkout smoke helpers", () => {
  it("accepts and summarizes a settled public checkout", () => {
    expect(isPurchasedCheckoutResponse(checkout, campaignId)).toBe(true);
    expect(summarizePurchasedCheckout(checkout, campaignId)).toEqual({
      campaignId,
      sessionId,
      amountCents: 5000,
      cpmCents: 5000,
      budgetCents: 5000,
      settled: true,
    });
  });

  it("rejects checkout responses that are not funded for the purchased campaign", () => {
    expect(isPurchasedCheckoutResponse(null, campaignId)).toBe(false);
    expect(
      isPurchasedCheckoutResponse(
        { ...checkout, settled: false, campaign: { ...checkout.campaign, budgetCents: 0 } },
        campaignId,
      ),
    ).toBe(false);
    expect(
      isPurchasedCheckoutResponse(
        { ...checkout, campaign: { ...checkout.campaign, id: "other" } },
        campaignId,
      ),
    ).toBe(false);
  });

  it("accepts leaderboard visibility for the purchased campaign", () => {
    expect(isPurchasedCampaignMarketResponse(market, campaignId)).toBe(true);
    expect(summarizePurchasedCampaignMarket(market, campaignId)).toEqual({
      liveCampaigns: 2,
      campaignId,
      rank: 1,
      bidLabel: "$50.00 / 1k imps",
      remainingBudgetUsd: "$50.00",
    });
  });

  it("accepts authenticated ad feed selection for the purchased campaign", () => {
    expect(isPurchasedCampaignAdResponse(ad, campaignId)).toBe(true);
    expect(
      isPurchasedCampaignAdResponse(
        { ...ad, destinationUrl: "https://www.spinshare.dev/checkout-smoke" },
        campaignId,
      ),
    ).toBe(false);
    expect(summarizePurchasedCampaignAd(ad, campaignId)).toEqual({
      campaignId,
      adText: "SpinShare Checkout Smoke - funded local purchase",
      brandName: "Checkout Smoke",
      cpmUsd: "50.00",
      destinationHost: "127.0.0.1:3000",
    });
  });

  it("accepts same-email advertiser dashboard campaign visibility", () => {
    expect(isPurchasedCampaignDashboardResponse(dashboard, campaignId)).toBe(true);
    expect(summarizePurchasedCampaignDashboard(dashboard, campaignId)).toEqual({
      campaignId,
      budgetCents: 5000,
      cpmCents: 5000,
      shows: 1,
      credited: 0,
      clicks: 0,
    });
  });

  it("accepts checkout and funding activity rows for the purchased campaign", () => {
    expect(isPurchasedCampaignActivityResponse(activity, campaignId, sessionId)).toBe(true);
    expect(summarizePurchasedCampaignActivity(activity, campaignId, sessionId)).toEqual({
      campaignId,
      sessionId,
      statuses: ["checkoutStarted", "budgetFunded"],
    });
  });
});
