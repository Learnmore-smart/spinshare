import { describe, expect, it } from "vitest";

import {
  localCredentialsEnabledFromEnv,
  localTestCredentialsForRole,
  resolveInitialRole,
  SIGNIN_PAGE_COPY,
} from "./page";

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

  it("infers advertiser from advertiser dashboard callbacks", () => {
    expect(
      resolveInitialRole(
        new URLSearchParams("callbackUrl=%2Fdashboard%2Fadvertiser"),
      ),
    ).toBe("advertiser");
    expect(
      resolveInitialRole(
        new URLSearchParams(
          "callbackUrl=%2Fdashboard%2Fadvertiser%2Fcampaigns",
        ),
      ),
    ).toBe("advertiser");
    expect(
      resolveInitialRole(
        new URLSearchParams(
          "role=developer&callbackUrl=%2Fdashboard%2Fadvertiser",
        ),
      ),
    ).toBe("developer");
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

describe("local credentials sign-in helpers", () => {
  it("enables local credentials only through the public local flag", () => {
    expect(localCredentialsEnabledFromEnv({})).toBe(false);
    expect(
      localCredentialsEnabledFromEnv({
        NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS: "0",
      }),
    ).toBe(false);
    expect(
      localCredentialsEnabledFromEnv({
        NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS: "1",
      }),
    ).toBe(true);
  });

  it("uses fixed local test accounts for each selected role", () => {
    expect(localTestCredentialsForRole("developer")).toEqual({
      email: "developer@spinshare.test",
      password: "spinshare",
    });
    expect(localTestCredentialsForRole("advertiser")).toEqual({
      email: "advertiser@spinshare.test",
      password: "spinshare",
    });
  });
});
