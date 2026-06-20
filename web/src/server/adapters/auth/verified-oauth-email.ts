import type { AuthProviderId } from "@spinshare/core";

import { normalizeIdentityEmail } from "../../identity/canonical-user-id";

interface VerifiedOAuthEmailInput {
  provider: AuthProviderId;
  profile?: Record<string, unknown>;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function isGitHubEmail(value: unknown): value is GitHubEmail {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { email?: unknown }).email === "string" &&
    typeof (value as { primary?: unknown }).primary === "boolean" &&
    typeof (value as { verified?: unknown }).verified === "boolean"
  );
}

/** Resolves only provider-verified email addresses for account linking. */
export async function resolveVerifiedOAuthEmail({
  provider,
  profile = {},
  accessToken,
  fetchImpl = fetch,
}: VerifiedOAuthEmailInput): Promise<string> {
  if (provider === "google") {
    if (
      profile.email_verified !== true ||
      typeof profile.email !== "string"
    ) {
      throw new Error("Google did not provide a verified email");
    }
    return normalizeIdentityEmail(profile.email);
  }

  if (!accessToken?.trim()) {
    throw new Error("GitHub email verification failed: missing access token");
  }
  const response = await fetchImpl("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "spinshare",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub email verification failed: HTTP ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("GitHub email verification failed: invalid response");
  }
  const emails = raw.filter(isGitHubEmail);
  const verified =
    emails.find((entry) => entry.primary && entry.verified) ??
    emails.find((entry) => entry.verified);
  if (!verified) {
    throw new Error("GitHub did not provide a verified email");
  }
  return normalizeIdentityEmail(verified.email);
}
