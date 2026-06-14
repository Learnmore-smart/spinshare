import { describe, expect, it } from "vitest";

import { resolveInitialRole, SIGNIN_PAGE_COPY } from "./page";

describe("resolveInitialRole", () => {
  it("uses advertiser when role=advertiser", () => {
    expect(resolveInitialRole(new URLSearchParams("role=advertiser"))).toBe(
      "advertiser",
    );
  });

  it("defaults to developer for missing or invalid roles", () => {
    expect(resolveInitialRole(new URLSearchParams())).toBe("developer");
    expect(resolveInitialRole(new URLSearchParams("role=owner"))).toBe(
      "developer",
    );
  });
});

describe("SIGNIN_PAGE_COPY", () => {
  it("describes the clean split sign-in page", () => {
    expect(SIGNIN_PAGE_COPY.headline).toBe("Sign in to see your balance");
    expect(SIGNIN_PAGE_COPY.body).toBe(
      "SpinShare pays you for each ad shown for at least 3 seconds during AI wait states. Sign in to see your balance, watch live bid activity, and withdraw earnings.",
    );
    expect(SIGNIN_PAGE_COPY.panelLabel).toBe("Authentication");
    expect(SIGNIN_PAGE_COPY.developerRole).toBe("Developer");
    expect(SIGNIN_PAGE_COPY.advertiserRole).toBe("Advertiser");
  });
});
