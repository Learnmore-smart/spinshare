import { createHash } from "node:crypto";

import type { AuthProviderId } from "@spinshare/core";

/** Normalizes a provider-verified email for canonical identity resolution. */
export function normalizeIdentityEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) {
    throw new Error("Verified identity email is required");
  }
  return normalized;
}

/** Stable first-sign-in user id shared by providers with the same verified email. */
export function canonicalUserIdForEmail(email: string): string {
  const digest = createHash("sha256")
    .update(normalizeIdentityEmail(email))
    .digest("hex");
  return `usr_${digest}`;
}

/** Opaque Firestore key for a persistent provider-account identity mapping. */
export function identityMappingId(
  provider: AuthProviderId,
  providerAccountId: string,
): string {
  const accountId = providerAccountId.trim();
  if (accountId.length === 0) {
    throw new Error("Provider account id is required");
  }
  return createHash("sha256")
    .update(`${provider}\0${accountId}`)
    .digest("hex");
}
