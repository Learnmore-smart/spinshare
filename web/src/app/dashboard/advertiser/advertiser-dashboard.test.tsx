import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvertiserDashboard } from "./advertiser-dashboard";

describe("AdvertiserDashboard", () => {
  it("shows the 3-second minimum views policy", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserDashboard, { token: "tok_123" }),
    );

    expect(html).toContain("Advertiser dashboard");
    expect(html).toContain("3-second minimum views");
  });

  it("renders zero-value telemetry containers before campaign data loads", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserDashboard, { token: "tok_123" }),
    );

    expect(html).toContain("Total shows");
    expect(html).toContain("Served");
    expect(html).toContain("Clicks");
    expect(html).toContain(">0<");
  });

  it("renders the activity feed shell before activity data loads", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserDashboard, { token: "tok_123" }),
    );

    expect(html).toContain("Recent activity");
    expect(html).toContain("Loading activity");
  });
});
