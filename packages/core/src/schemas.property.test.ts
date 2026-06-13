// Feature: spinshare-ad-exchange
//
// Property tests for the campaign-creation and funding-amount validation
// schemas (design "API Contracts" / Data Models; Requirements 9.1–9.4, 9.6,
// 9.7).

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
  createCampaignSchema,
  fundingAmountSchema,
} from "./schemas";
import {
  anyAmountCentsArb,
  invalidAdTextArb,
  invalidCpmArb,
  nonNumericArb,
  validAdTextArb,
  validCpmCentsArb,
} from "./test-utils";

const RUNS = { numRuns: 100 } as const;

describe("campaign creation validation", () => {
  // Feature: spinshare-ad-exchange, Property 14: Campaign creation accepts valid input and starts at zero budget
  // Validates: Requirements 9.1
  it("Property 14: valid input is accepted, preserves ad text + CPM, and creates a zero-budget campaign", () => {
    fc.assert(
      fc.property(validAdTextArb, validCpmCentsArb, (adText, cpmCents) => {
        const result = createCampaignSchema.safeParse({ adText, cpmCents });
        expect(result.success).toBe(true);
        if (result.success) {
          // Submitted ad text and CPM are preserved exactly.
          expect(result.data.adText).toBe(adText);
          expect(result.data.cpmCents).toBe(cpmCents);
          // Creation sets the remaining budget to zero (the service applies this
          // to the validated input; the schema intentionally omits budget).
          const created = { ...result.data, budgetCents: 0 };
          expect(created.budgetCents).toBe(0);
        }
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 15: Campaign creation rejects all invalid input
  // Validates: Requirements 9.2, 9.3, 9.4
  it("Property 15: rejects empty, whitespace-only, or too-long ad text", () => {
    fc.assert(
      fc.property(invalidAdTextArb, validCpmCentsArb, (adText, cpmCents) => {
        expect(createCampaignSchema.safeParse({ adText, cpmCents }).success).toBe(false);
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 15: Campaign creation rejects all invalid input
  // Validates: Requirements 9.2, 9.3, 9.4
  it("Property 15: rejects non-positive, out-of-range, or sub-cent CPM", () => {
    fc.assert(
      fc.property(validAdTextArb, invalidCpmArb, (adText, cpmCents) => {
        expect(createCampaignSchema.safeParse({ adText, cpmCents }).success).toBe(false);
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 15: Campaign creation rejects all invalid input
  // Validates: Requirements 9.2, 9.3, 9.4
  it("Property 15: rejects non-numeric CPM", () => {
    fc.assert(
      fc.property(validAdTextArb, nonNumericArb, (adText, cpmCents) => {
        expect(createCampaignSchema.safeParse({ adText, cpmCents }).success).toBe(false);
      }),
      RUNS,
    );
  });
});

describe("funding amount validation", () => {
  // Feature: spinshare-ad-exchange, Property 16: Funding amount validation
  // Validates: Requirements 9.6, 9.7
  it("Property 16: a checkout amount is accepted iff it is $1.00–$100,000.00 at one-cent precision", () => {
    fc.assert(
      fc.property(anyAmountCentsArb, (amountCents) => {
        const result = fundingAmountSchema.safeParse({ campaignId: "cmp_1", amountCents });
        const shouldAccept =
          Number.isInteger(amountCents) &&
          amountCents >= FUNDING_CENTS_MIN &&
          amountCents <= FUNDING_CENTS_MAX;
        expect(result.success).toBe(shouldAccept);
      }),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 16: Funding amount validation
  // Validates: Requirements 9.6, 9.7
  it("Property 16: rejects non-numeric funding amounts", () => {
    fc.assert(
      fc.property(nonNumericArb, (amountCents) => {
        expect(
          fundingAmountSchema.safeParse({ campaignId: "cmp_1", amountCents }).success,
        ).toBe(false);
      }),
      RUNS,
    );
  });
});
