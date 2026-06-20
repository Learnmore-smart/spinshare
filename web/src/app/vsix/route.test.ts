import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /vsix", () => {
  it("redirects to the static VSIX with a host-independent relative location", () => {
    const res = GET();

    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("/spinshare.vsix");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });
});
