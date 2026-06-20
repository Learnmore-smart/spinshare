import { describe, expect, it } from "vitest";

import { resolveVerifiedOAuthEmail } from "./verified-oauth-email";

function githubResponse(
  emails: Array<{ email: string; primary: boolean; verified: boolean }>,
  status = 200,
): typeof fetch {
  return async () =>
    new Response(JSON.stringify(emails), {
      status,
      headers: { "content-type": "application/json" },
    });
}

describe("resolveVerifiedOAuthEmail", () => {
  it("accepts and normalizes a verified Google email", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "google",
        profile: {
          email: " Person@Example.com ",
          email_verified: true,
        },
      }),
    ).resolves.toBe("person@example.com");
  });

  it("rejects Google profiles without a verified email", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "google",
        profile: { email: "person@example.com", email_verified: false },
      }),
    ).rejects.toThrow("Google did not provide a verified email");
  });

  it("prefers GitHub's verified primary email", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "github",
        accessToken: "github-token",
        fetchImpl: githubResponse([
          { email: "fallback@example.com", primary: false, verified: true },
          { email: "Primary@Example.com", primary: true, verified: true },
        ]),
      }),
    ).resolves.toBe("primary@example.com");
  });

  it("falls back to another verified GitHub email", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "github",
        accessToken: "github-token",
        fetchImpl: githubResponse([
          { email: "primary@example.com", primary: true, verified: false },
          { email: "Verified@Example.com", primary: false, verified: true },
        ]),
      }),
    ).resolves.toBe("verified@example.com");
  });

  it("rejects GitHub when no email is verified", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "github",
        accessToken: "github-token",
        fetchImpl: githubResponse([
          { email: "person@example.com", primary: true, verified: false },
        ]),
      }),
    ).rejects.toThrow("GitHub did not provide a verified email");
  });

  it("rejects GitHub API failures", async () => {
    await expect(
      resolveVerifiedOAuthEmail({
        provider: "github",
        accessToken: "github-token",
        fetchImpl: githubResponse([], 503),
      }),
    ).rejects.toThrow("GitHub email verification failed");
  });
});
