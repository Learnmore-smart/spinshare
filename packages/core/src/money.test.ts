import { describe, expect, it } from "vitest";

import {
  IMPRESSIONS_PER_BLOCK,
  reconstructCampaignDelivery,
} from "./money";

/**
 * Unit tests for {@link reconstructCampaignDelivery}.
 *
 * The function exists to undo the few-cent budget drift introduced by the
 * Redis→Firestore flush (which rounds each batch's sub-cent spend to whole
 * cents). It snaps the budget-derived purchase back onto the 1,000-view block
 * grid so the public market shows the exact impressions bought and dollars paid.
 */
describe("reconstructCampaignDelivery", () => {
  it("reports the exact paid amount and purchased views for a fresh block fund", () => {
    // 1 block at a $5.00 CPM = $5.00 buys exactly 1,000 views, none served yet.
    const delivery = reconstructCampaignDelivery(500, 500, 0);
    expect(delivery.purchasedImpressions).toBe(1000);
    expect(delivery.totalPaidCents).toBe(500);
  });

  it("regression: $5.00 / 1,000 views does not drift to $4.95 / 991", () => {
    // The reported bug. After serving 21 views, flush rounding left the budget
    // at 485c (not the exact 489.5c). Naively: 21 + floor(485*1000/500) = 991
    // purchased and 485 + floor(21*500/1000) = 495c ("$4.95") paid. Snapping to
    // the block grid restores the truth: 1,000 views bought for $5.00.
    const delivery = reconstructCampaignDelivery(500, 485, 21);
    expect(delivery.purchasedImpressions).toBe(1000);
    expect(delivery.totalPaidCents).toBe(500);
  });

  it("snaps multi-block budgets that drifted below a round thousand", () => {
    // 2 blocks at $5.00 CPM, budget drifted to 997c, 3 served.
    // raw = 3 + floor(997*1000/500) = 1997 -> rounds to 2 blocks.
    const delivery = reconstructCampaignDelivery(500, 997, 3);
    expect(delivery.purchasedImpressions).toBe(2000);
    expect(delivery.totalPaidCents).toBe(1000);
  });

  it("never reports fewer purchased views than already served", () => {
    // Budget fully spent on a fully delivered 1-block campaign.
    const delivery = reconstructCampaignDelivery(500, 0, 1000);
    expect(delivery.purchasedImpressions).toBe(1000);
    expect(delivery.totalPaidCents).toBe(500);
  });

  it("rounds the raw total to the nearest whole block", () => {
    // 5 blocks at a $1.00 CPM, untouched budget of $5.00.
    const delivery = reconstructCampaignDelivery(100, 500, 0);
    expect(delivery.purchasedImpressions).toBe(5 * IMPRESSIONS_PER_BLOCK);
    expect(delivery.totalPaidCents).toBe(500);
  });

  it("treats negative or fractional served counts defensively", () => {
    const delivery = reconstructCampaignDelivery(500, 500, -10);
    expect(delivery.purchasedImpressions).toBe(1000);
    expect(delivery.totalPaidCents).toBe(500);
  });

  it("falls back to the raw budget when CPM is non-positive", () => {
    const delivery = reconstructCampaignDelivery(0, 750, 12);
    expect(delivery.purchasedImpressions).toBe(12);
    expect(delivery.totalPaidCents).toBe(750);
  });
});
