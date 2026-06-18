/**
 * Unit tests for the advertiser dashboard's pure input helpers (task 12.4).
 *
 * These cover dollar→cents parsing (including one-cent-precision rejection) and
 * the CPM / funding bound checks that mirror the core schema, plus the live
 * ad-text counter state. They keep the dashboard's client-side validation
 * honest against the shared bounds (R9.1, R9.6, R9.7).
 */

import { describe, expect, it } from "vitest";
import {
  ADVERTISER_CHECKOUT_BLOCKS_MAX,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
} from "@spinshare/core";

import {
  ZERO_CAMPAIGN_TELEMETRY,
  adTextState,
  campaignSpendCents,
  deliveryProgress,
  displayStatus,
  formatUsd,
  formatUsdPrecise,
  formatCtr,
  isNeverFunded,
  nonCreditTotal,
  parseDollarsToCents,
  sumCampaignTelemetry,
  totalSpendCents,
  validateCpmDollars,
  validateFundingBlocks,
  validateFundingDollars,
  type CampaignView,
} from "./lib";

/** Minimal CampaignView builder for the derived-display helpers. */
function makeCampaign(overrides: Partial<CampaignView> = {}): CampaignView {
  return {
    id: "cmp_x",
    advertiserId: "adv_1",
    adText: "Ad",
    destinationUrl: "https://learnx.pro/",
    cpmCents: 500,
    cpmUsd: "5.00",
    budgetCents: 500,
    remainingBudgetUsd: "5.00",
    status: "active",
    createdAtMs: 0,
    ...overrides,
  } as CampaignView;
}

describe("parseDollarsToCents", () => {
  it("parses whole dollars", () => {
    expect(parseDollarsToCents("12")).toBe(1200);
  });

  it("parses one and two decimal places", () => {
    expect(parseDollarsToCents("12.5")).toBe(1250);
    expect(parseDollarsToCents("12.34")).toBe(1234);
    expect(parseDollarsToCents("0.01")).toBe(1);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDollarsToCents("  5.00  ")).toBe(500);
  });

  it("rejects empty / non-numeric input", () => {
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("   ")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
    expect(parseDollarsToCents("$5")).toBeNull();
    expect(parseDollarsToCents("1,000")).toBeNull();
    expect(parseDollarsToCents("-5")).toBeNull();
  });

  it("rejects sub-cent precision (more than two decimals)", () => {
    expect(parseDollarsToCents("1.234")).toBeNull();
    expect(parseDollarsToCents("0.001")).toBeNull();
  });
});

describe("validateCpmDollars", () => {
  it("accepts the minimum and maximum bids", () => {
    expect(validateCpmDollars("1.00")).toEqual({ ok: true, cents: CPM_CENTS_MIN });
    expect(validateCpmDollars("1000.00")).toEqual({
      ok: true,
      cents: CPM_CENTS_MAX,
    });
  });

  it("rejects zero and below-minimum bids", () => {
    expect(validateCpmDollars("0").ok).toBe(false);
    expect(validateCpmDollars("0.00").ok).toBe(false);
    expect(validateCpmDollars("0.99").ok).toBe(false);
  });

  it("rejects above-maximum bids", () => {
    expect(validateCpmDollars("1000.01").ok).toBe(false);
  });

  it("rejects malformed bids", () => {
    expect(validateCpmDollars("abc").ok).toBe(false);
    expect(validateCpmDollars("1.234").ok).toBe(false);
  });
});

describe("validateFundingDollars", () => {
  it("accepts the minimum and maximum amounts", () => {
    expect(validateFundingDollars("1.00")).toEqual({
      ok: true,
      cents: FUNDING_CENTS_MIN,
    });
    expect(validateFundingDollars("100000.00")).toEqual({
      ok: true,
      cents: FUNDING_CENTS_MAX,
    });
  });

  it("rejects below-minimum amounts", () => {
    expect(validateFundingDollars("0.99").ok).toBe(false);
  });

  it("rejects above-maximum amounts", () => {
    expect(validateFundingDollars("100000.01").ok).toBe(false);
  });

  it("rejects sub-cent precision", () => {
    expect(validateFundingDollars("10.999").ok).toBe(false);
  });
});

describe("validateFundingBlocks", () => {
  it("accepts whole positive block counts", () => {
    expect(validateFundingBlocks("1")).toEqual({ ok: true, blocks: 1 });
    expect(validateFundingBlocks("25")).toEqual({ ok: true, blocks: 25 });
  });

  it("rejects invalid block counts", () => {
    for (const value of ["", "0", "-1", "1.5", "abc"]) {
      expect(validateFundingBlocks(value).ok).toBe(false);
    }
  });

  it("rejects block counts above the shared maximum", () => {
    expect(validateFundingBlocks(String(ADVERTISER_CHECKOUT_BLOCKS_MAX + 1)).ok).toBe(
      false,
    );
  });
});

describe("adTextState", () => {
  it("flags empty / whitespace-only text as invalid", () => {
    expect(adTextState("")).toMatchObject({ isEmpty: true, valid: false });
    expect(adTextState("   ")).toMatchObject({ isEmpty: true, valid: false });
  });

  it("counts characters and remaining capacity", () => {
    const state = adTextState("hello");
    expect(state.length).toBe(5);
    expect(state.remaining).toBe(55);
    expect(state.valid).toBe(true);
    expect(state.overLimit).toBe(false);
  });

  it("flags text over the 60-char limit", () => {
    const state = adTextState("x".repeat(61));
    expect(state.overLimit).toBe(true);
    expect(state.remaining).toBe(-1);
    expect(state.valid).toBe(false);
  });

  it("treats exactly 60 characters as valid", () => {
    const state = adTextState("x".repeat(60));
    expect(state.remaining).toBe(0);
    expect(state.overLimit).toBe(false);
    expect(state.valid).toBe(true);
  });
});

describe("formatUsd", () => {
  it("prefixes a dollar sign and renders two decimals", () => {
    expect(formatUsd(3000)).toBe("$30.00");
    expect(formatUsd(1)).toBe("$0.01");
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("campaign telemetry helpers", () => {
  it("sums zero telemetry for an empty campaign list", () => {
    expect(sumCampaignTelemetry([])).toEqual(ZERO_CAMPAIGN_TELEMETRY);
  });

  it("sums telemetry across campaigns and formats CTR", () => {
    const campaigns = [
      {
        id: "cmp_1",
        advertiserId: "adv_1",
        adText: "Ad",
        cpmCents: 3000,
        cpmUsd: "30.00",
        budgetCents: 1000,
        remainingBudgetUsd: "10.00",
        status: "active",
        createdAtMs: 0,
        telemetry: {
          shows: 100,
          clicks: 5,
          credited: 80,
          tooShort: 7,
          invalidToken: 3,
          invalidCampaign: 2,
          shadowBanned: 6,
          earningCapped: 1,
          duplicate: 1,
        },
      },
    ] satisfies CampaignView[];

    const total = sumCampaignTelemetry(campaigns);

    expect(total.shows).toBe(100);
    expect(total.clicks).toBe(5);
    expect(total.credited).toBe(80);
    expect(nonCreditTotal(total)).toBe(20);
    expect(formatCtr(total.clicks, total.shows)).toBe("5.0%");
    expect(formatCtr(0, 0)).toBe("0.0%");
  });
});

describe("formatUsdPrecise", () => {
  it("renders sub-cent spend with 3 decimals", () => {
    // 5 impressions at $5 CPM => 5 * 500 / 1000 = 2.5 cents => $0.025.
    expect(formatUsdPrecise(2.5)).toBe("$0.025");
    expect(formatUsdPrecise(0)).toBe("$0.000");
    expect(formatUsdPrecise(250)).toBe("$2.500");
  });
});

describe("campaignSpendCents / totalSpendCents", () => {
  it("computes fractional spend from credited impressions and CPM", () => {
    const campaign = makeCampaign({
      cpmCents: 500,
      telemetry: { ...ZERO_CAMPAIGN_TELEMETRY, credited: 5 },
    });
    // 5 * 500 / 1000 = 2.5 cents (not rounded to 3).
    expect(campaignSpendCents(campaign)).toBe(2.5);
    expect(totalSpendCents([campaign, campaign])).toBe(5);
    expect(formatUsdPrecise(campaignSpendCents(campaign))).toBe("$0.025");
  });
});

describe("deliveryProgress", () => {
  it("snaps the denominator to the nearest 1,000-block (fixes 5/997)", () => {
    // 1 block ($5 CPM) bought; budget drifted to 497c after rounding, 5 served.
    const campaign = makeCampaign({ cpmCents: 500, budgetCents: 497 });
    const { purchased, percent } = deliveryProgress(campaign, 5);
    expect(purchased).toBe(1000);
    expect(percent).toBeCloseTo(0.5, 5);
  });

  it("snaps multi-block totals and never drops below served", () => {
    // 2 blocks bought; remaining budget ~ 997c => raw 1997 => snaps to 2000.
    expect(deliveryProgress(makeCampaign({ cpmCents: 500, budgetCents: 997 }), 3).purchased).toBe(
      2000,
    );
    // Fully delivered, budget exhausted: denominator equals served.
    expect(deliveryProgress(makeCampaign({ cpmCents: 500, budgetCents: 0 }), 1000).purchased).toBe(
      1000,
    );
  });
});

describe("displayStatus", () => {
  it("derives funded vs unfunded instead of the always-active stored status", () => {
    expect(displayStatus(makeCampaign({ budgetCents: 500 }))).toBe("active");
    expect(displayStatus(makeCampaign({ budgetCents: 0 }))).toBe("unfunded");
  });

  it("marks funded campaigns without a destination as needing a link", () => {
    expect(
      displayStatus(makeCampaign({ budgetCents: 500, destinationUrl: undefined })),
    ).toBe("needsLink");
  });

  it("prioritises review state and explicit pause", () => {
    expect(
      displayStatus(makeCampaign({ budgetCents: 500, reviewStatus: "rejected" })),
    ).toBe("rejected");
    expect(
      displayStatus(makeCampaign({ budgetCents: 500, reviewStatus: "pending" })),
    ).toBe("underReview");
    expect(displayStatus(makeCampaign({ budgetCents: 500, status: "paused" }))).toBe(
      "paused",
    );
  });
});

describe("isNeverFunded", () => {
  it("is true only when there is no budget and no delivery", () => {
    expect(isNeverFunded(makeCampaign({ budgetCents: 0 }))).toBe(true);
    expect(isNeverFunded(makeCampaign({ budgetCents: 500 }))).toBe(false);
    expect(
      isNeverFunded(
        makeCampaign({
          budgetCents: 0,
          telemetry: { ...ZERO_CAMPAIGN_TELEMETRY, shows: 3 },
        }),
      ),
    ).toBe(false);
  });
});
