import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarketDeliveryProgress } from "./market-delivery-progress";

describe("MarketDeliveryProgress", () => {
  it("renders exact delivery counts and accessible progress semantics", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketDeliveryProgress, {
        servedImpressions: 1_250,
        purchasedImpressions: 5_000,
        deliveryPercent: 25,
        ariaLabel: "1,250 of 5,000 impressions delivered",
      }),
    );

    expect(html).toContain("1,250 / 5,000");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain(
      'aria-label="1,250 of 5,000 impressions delivered"',
    );
    expect(html).toContain("width:25%");
  });

  it("clamps an invalid visual percentage without changing counts", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketDeliveryProgress, {
        servedImpressions: 6_000,
        purchasedImpressions: 5_000,
        deliveryPercent: Number.POSITIVE_INFINITY,
        ariaLabel: "6,000 of 5,000 impressions delivered",
      }),
    );

    expect(html).toContain("6,000 / 5,000");
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain("width:0%");
  });
});
