import { describe, expect, it } from "vitest";

import {
  AD_TEXT_MAX_LENGTH,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
  advertiserCheckoutSchema,
  createCampaignSchema,
  fundingBlockCheckoutSchema,
  fundingAmountSchema,
  getAdvertiserCheckoutAmountCents,
  reviewAdTextSafety,
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

  it("preserves an optional checkout block count for dashboard creation", () => {
    const parsed = createCampaignSchema.safeParse({
      adText: "Try SpinShare for Claude Code",
      cpmCents: CPM_CENTS_MIN,
      blockCount: 3,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.blockCount).toBe(3);
    }
  });

  it("rejects invalid dashboard checkout block counts", () => {
    for (const blockCount of [0, -1, 1.5, Number.NaN, "3"]) {
      expect(
        createCampaignSchema.safeParse({
          adText: "Try SpinShare for Claude Code",
          cpmCents: CPM_CENTS_MIN,
          blockCount,
        }).success,
      ).toBe(false);
    }
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
    for (const cpmCents of [0, -1, 1.5, CPM_CENTS_MIN - 1, CPM_CENTS_MAX + 1, Number.NaN]) {
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

  it("rejects clearly unsafe or deceptive ad copy", () => {
    for (const adText of [
      "Enter your seed phrase to restore wallet",
      "Share your password to unlock account",
      "Claim free crypto airdrop now",
      "Verify your wallet login today",
    ]) {
      const parsed = createCampaignSchema.safeParse({
        adText,
        cpmCents: CPM_CENTS_MIN,
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe(
          "Ad text appears unsafe or deceptive",
        );
      }
    }
  });

  it("allows ordinary security-tool copy while reviewing ad text narrowly", () => {
    expect(reviewAdTextSafety("Try password manager training")).toEqual({
      safe: true,
    });
    expect(
      createCampaignSchema.safeParse({
        adText: "Try password manager training",
        cpmCents: CPM_CENTS_MIN,
      }).success,
    ).toBe(true);
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

describe("fundingBlockCheckoutSchema", () => {
  it("accepts a campaign id and whole block count", () => {
    expect(
      fundingBlockCheckoutSchema.safeParse({
        campaignId: "cmp_1",
        blockCount: 3,
      }).success,
    ).toBe(true);
  });

  it("rejects arbitrary amount-based payloads", () => {
    expect(
      fundingBlockCheckoutSchema.safeParse({
        campaignId: "cmp_1",
        amountCents: 2500,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid block counts", () => {
    for (const blockCount of [undefined, 0, -1, 1.5, Number.NaN, "3"]) {
      expect(
        fundingBlockCheckoutSchema.safeParse({
          campaignId: "cmp_1",
          blockCount,
        }).success,
      ).toBe(false);
    }
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

  it("rejects syntactically valid but unsafe destination URLs", () => {
    for (const destinationUrl of [
      "https://user:pass@example.com/",
      "https://localhost/",
      "https://preview.local/",
      "https://127.0.0.1/",
      "https://10.0.0.1/",
      "https://example.com:8443/",
    ]) {
      expect(
        advertiserCheckoutSchema.safeParse({
          ...validCheckout,
          destinationUrl,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects phishing-prone or review-bypass destination URLs", () => {
    for (const destinationUrl of [
      "https://xn--pple-43d.com/",
      "https://example/",
      "https://bit.ly/spinshare",
      "https://tinyurl.com/spinshare",
      "https://t.co/spinshare",
    ]) {
      expect(
        advertiserCheckoutSchema.safeParse({
          ...validCheckout,
          destinationUrl,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects unsafe public checkout ad copy before payment", () => {
    expect(
      advertiserCheckoutSchema.safeParse({
        ...validCheckout,
        adText: "Claim free crypto airdrop now",
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

  it("accepts positive view durations below the 3-second settlement threshold", () => {
    expect(
      trackRequestSchema.safeParse({
        campaignId: "cmp_1",
        viewDurationMs: 1,
      }).success,
    ).toBe(true);
    expect(
      trackRequestSchema.safeParse({
        campaignId: "cmp_1",
        viewDurationMs: 2999,
      }).success,
    ).toBe(true);
  });

  it("requires an integer view duration", () => {
    for (const viewDurationMs of [undefined, 0, -1, 3000.5, Number.NaN, "3000"]) {
      expect(
        trackRequestSchema.safeParse({ campaignId: "cmp_1", viewDurationMs })
          .success,
      ).toBe(false);
    }
  });
});
