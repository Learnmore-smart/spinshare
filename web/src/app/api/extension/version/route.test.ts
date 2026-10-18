import { describe, expect, it } from "vitest";

import { LATEST_EXTENSION_VERSION } from "@/lib/extension-release";

import { GET } from "./route";

describe("GET /api/extension/version", () => {
  it("advertises the latest version and a same-origin VSIX download URL", async () => {
    const res = GET(new Request("https://spinshare-web-vert.vercel.app/api/extension/version"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = (await res.json()) as { version: string; url: string };
    expect(body.version).toBe(LATEST_EXTENSION_VERSION);
    expect(body.url).toBe("https://spinshare-web-vert.vercel.app/vsix");
  });

  it("resolves the download URL against a localhost dev origin", async () => {
    const res = GET(new Request("http://localhost:3000/api/extension/version"));

    const body = (await res.json()) as { url: string };
    expect(body.url).toBe("http://localhost:3000/vsix");
  });
});
