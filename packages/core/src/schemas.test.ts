import { describe, expect, it } from "vitest";

import {
  AD_TEXT_MAX_LENGTH,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
  advertiserCheckoutSchema,
  createCampaignSchema,
  fundingAmountSchema,
  getAdvertiserCheckoutAmountCents,
  trackRequestSchema,
} from "./schemas";

describe("createCampaignSchema", () => {
  it("accepts valid ad text and CPM at the boundaries", () => {
    expect(
      createCampaignSchema.safeParse({ adText: "A", cpmCents: CPM_CENTS_MIN })
        .success,
    ).toBe(true);
    expect(
      createCampaignSchema.safeParse({
        adText: "x".repeat(AD_TEXT_MAX_LENGTH),
        cpmCents: CPM_CENTS_MAX,
      }).success,
    ).toBe(true);
  });

  it("rejects ad text longer than 60 characters (Requirement 9.2)", () => {
    expect(
      createCampaignSchema.safeParse({
        adText: "x".repeat(AD_TEXT_MAX_LENGTH + 1),
        cpmCents: 100,
      }).success,
    ).toBe(false);
  });

  it("rejects empty or whitespace-only ad text (Requirement 9.3)", () => {
    expect(
      createCampaignSchema.safeParse({ adText: "", cpmCents: 100 }).success,
    ).toBe(false);
    expect(
      createCampaignSchema.safeParse({ adText: "   ", cpmCents: 100 }).success,
    ).toBe(false);
    expect(
      createCampaignSchema.safeParse({ adText: "\t\n ", cpmCents: 100 }).success,
    ).toBe(false);
  });

  it("rejects zero, negative, non-integer, and out-of-range CPM (Requirement 9.4)", () => {
    for (const cpmCents of [0, -1, 1.5, CPM_CENTS_MAX + 1, Number.NaN]) {
      expect(
        createCampaignSchema.safeParse({ adText: "Ad", cpmCents }).success,
      ).toBe(false);
    }
  });

  it("rejects non-numeric CPM", () => {
    expect(
      createCampaignSchema.safeParse({ adText: "Ad", cpmCents: "30" }).success,
    ).toBe(false);
  });
});

describe("fundingAmountSchema", () => {
  it("accepts valid amounts at the boundaries (Requirement 9.6)", () => {
    expect(
      fundingAmountSchema.safeParse({
        campaignId: "cmp_1",
        amountCents: FUNDING_CENTS_MIN,
      }).success,
    ).toBe(true);
    expect(
      fundingAmountSchema.safeParse({
        campaignId: "cmp_1",
        amountCents: FUNDING_CENTS_MAX,
      }).success,
    ).toBe(true);
  });

  it("rejects below-min, above-max, non-integer, and non-numeric amounts (Requirement 9.7)", () => {
    for (const amountCents of [
      FUNDING_CENTS_MIN - 1,
      FUNDING_CENTS_MAX + 1,
      100.5,
      Number.NaN,
    ]) {
      expect(
        fundingAmountSchema.safeParse({ campaignId: "cmp_1", amountCents })
          .success,
      ).toBe(false);
    }
    expect(
      fundingAmountSchema.safeParse({
        campaignId: "cmp_1",
        amountCents: "100",
      }).success,
    ).toBe(false);
  });

  it("requires a non-empty campaign id", () => {
    expect(
      fundingAmountSchema.safeParse({ campaignId: "", amountCents: 100 })
        .success,
    ).toBe(false);
  });
});

describe("advertiserCheckoutSchema", () => {
  const validCheckout = {
    email: "ads@example.com",
    adText: "Try Linear — issue tracking built for speed",
    destinationUrl: "https://linear.app/",
    brandName: "Linear",
    publicOnLeaderboard: true,
    cpmCents: 500,
    blockCount: 2,
  };

  it("accepts a valid public checkout and derives total funding from blocks", () => {
    const parsed = advertiserCheckoutSchema.safeParse(validCheckout);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(getAdvertiserCheckoutAmountCents(parsed.data)).toBe(1000);
    }
  });

  it("accepts private leaderboard submissions", () => {
    expect(
      advertiserCheckoutSchema.safeParse({
        ...validCheckout,
        publicOnLeaderboard: false,
      }).success,
    ).toBe(true);
  });

  it("rejects non-HTTPS destination URLs", () => {
    expect(
      advertiserCheckoutSchema.safeParse({
        ...validCheckout,
        destinationUrl: "http://linear.app/",
      }).success,
    ).toBe(false);
  });

  it("rejects block counts that exceed the funding maximum", () => {
    expect(
      advertiserCheckoutSchema.safeParse({
        ...validCheckout,
        cpmCents: FUNDING_CENTS_MAX,
        blockCount: 2,
      }).success,
    ).toBe(false);
  });
});

describe("trackRequestSchema", () => {
  it("accepts a non-empty campaign id with a 3-second view duration", () => {
    expect(
      trackRequestSchema.safeParse({
        campaignId: "cmp_1",
        viewDurationMs: 3000,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing or empty campaign id", () => {
    expect(trackRequestSchema.safeParse({ viewDurationMs: 3000 }).success).toBe(
      false,
    );
    expect(
      trackRequestSchema.safeParse({ campaignId: "", viewDurationMs: 3000 })
        .success,
    ).toBe(false);
  });

  it("rejects impressions below the 3-second minimum", () => {
    expect(
      trackRequestSchema.safeParse({
        campaignId: "cmp_1",
        viewDurationMs: 2999,
      }).success,
    ).toBe(false);
  });

  it("requires an integer view duration", () => {
    for (const viewDurationMs of [undefined, 3000.5, Number.NaN, "3000"]) {
      expect(
        trackRequestSchema.safeParse({ campaignId: "cmp_1", viewDurationMs })
          .success,
      ).toBe(false);
    }
  });
});
