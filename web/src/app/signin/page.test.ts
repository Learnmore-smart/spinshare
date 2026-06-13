import { describe, expect, it } from "vitest";

import { resolveInitialRole } from "./page";

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
