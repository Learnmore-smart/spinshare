import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import HomePage from "./page";

describe("HomePage", () => {
  it("starts with money-first copy and role-specific sign-in links", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(React.createElement(HomePage));

    expect(html).toContain("Loading live bids");
    expect(html).toContain("Your AI thinks");
    expect(html).toContain("You get paid");
    expect(html).toContain("aria-label=\"money\"");
    expect(html).toContain("🤑");
    expect(html).toContain("SpinShare turns idle AI waits into paid moments.");
    expect(html).toContain("We give you 60% of ad revenue + a $1 head start");
    expect(html).toContain("New users get a $1 gift — our treat. (Limited time)");
    expect(html).toContain("Market depth");
    expect(html).toContain("Delivery");
    expect(html).toContain("Bid live for the most-watched spinner");
    expect(html).toContain("EMAIL");
    expect(html).toContain("Destination URL");
    expect(html).toContain("Show me on the public leaderboard");
    expect(html).toContain("Checkout now on Stripe");
    expect(html).toContain("Stock Claude Code");
    expect(html).toContain("With SpinShare");
    expect(html).toContain("How it pays");
    expect(html).toContain("Only shown during waits");
    expect(html).toContain("role=developer");
    expect(html).toContain("role=advertiser");
    expect(html).toContain("fixed top-0 left-0 right-0 z-50");
    expect(html).not.toContain("Try Firecrawl");
    expect(html).not.toContain("$43.44/mo");
    expect(html).not.toContain("live estimate");
    expect(html).not.toContain("Install the VS Code extension");
    expect(html).not.toContain("bg-[#111815]");
  });
});
