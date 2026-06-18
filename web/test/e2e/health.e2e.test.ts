/**
 * Harness smoke test (task 15.1).
 *
 * Proves the e2e harness can start the Next.js app in `SPINSHARE_MODE=local` on
 * an ephemeral port and that HTTP routes become ready within the 60-second
 * startup timeout (Requirements 11.1, 11.8). The full settlement assertions
 * live in task 15.2 and reuse the same {@link startApp} harness.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startApp, type RunningApp } from "./harness";

describe("e2e harness", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await app?.stop();
  });

  it("binds an ephemeral port and exposes a base URL", () => {
    expect(app.port).toBeGreaterThan(0);
    expect(app.baseUrl).toBe(`http://127.0.0.1:${app.port}`);
  });

  it("serves GET /api/health with 200 once ready", async () => {
    const res = await fetch(`${app.baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("rejects anonymous GET /api/ad before ad selection", async () => {
    const res = await fetch(`${app.baseUrl}/api/ad`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Unauthorized");
  });
});
