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
  it("renders the archived postmortem landing page", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(React.createElement(HomePage));

    expect(html).toContain("SpinShare is an archived experiment");
    expect(html).toContain("AI workflow sponsor slots");
    expect(html).toContain("What actually happened");
    expect(html).toContain("52K");
    expect(html).toContain("views on X.com");
    expect(html).toContain("signups");
    expect(html).toContain("usage");
    expect(html).toContain("POSTMORTEM.md");
  });
});
