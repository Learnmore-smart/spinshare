import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("starts with money-first copy and role-specific sign-in links", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(React.createElement(HomePage));

    expect(html).toContain("Loading live bids");
    expect(html).toContain("Your AI thinks");
    expect(html).toContain("You get");
    expect(html).toContain("aria-label=\"money\"");
    expect(html).toContain("🤑");
    expect(html).toContain("/mo");
    expect(html).toContain("SpinShare turns idle AI waits into paid moments.");
    expect(html).toContain("60% of revenue goes to you.");
    expect(html).toContain("Market depth");
    expect(html).toContain("role=developer");
    expect(html).toContain("role=advertiser");
    expect(html).toContain("sticky top-0 z-50");
    expect(html).not.toContain("Try Firecrawl");
    expect(html).not.toContain("$43.44/mo");
    expect(html).not.toContain("live estimate");
    expect(html).not.toContain("Install the VS Code extension");
    expect(html).not.toContain("bg-[#111815]");
  });
});
