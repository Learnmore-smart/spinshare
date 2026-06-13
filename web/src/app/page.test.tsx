import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("starts with live-market copy and role-specific sign-in links", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(React.createElement(HomePage));

    expect(html).toContain("Loading live bids");
    expect(html).toContain("Install the VS Code extension");
    expect(html).toContain("Bid market");
    expect(html).toContain("role=developer");
    expect(html).toContain("role=advertiser");
    expect(html).not.toContain("Try Firecrawl");
    expect(html).not.toContain("$43.44/mo");
  });
});
