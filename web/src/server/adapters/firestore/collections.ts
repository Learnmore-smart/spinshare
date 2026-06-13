/**
 * Firestore collection names and document<->domain mappers.
 *
 * Centralizes the collection paths from design "Data Models" and the conversion
 * between persisted documents (which carry extra `Timestamp` fields) and the
 * pure `@spinshare/core` domain types used by the rest of the app.
 */

import type {
  AuthProviderId,
  Campaign,
  CampaignStatus,
  LedgerEntry,
  User,
  UserRole,
} from "@spinshare/core";

/** Collection paths (see design "Data Models"). */
export const COLLECTIONS = {
  users: "users",
  campaigns: "campaigns",
  ledgerEntries: "ledgerEntries",
  paymentEvents: "paymentEvents",
} as const;

/** Maps a `users/{userId}` document to the domain `User`. */
export function toUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    id,
    email: String(data.email ?? ""),
    provider: data.provider as AuthProviderId,
    role: data.role as UserRole,
    balanceCents: Number(data.balanceCents ?? 0),
  };
}

/** Maps a `campaigns/{campaignId}` document to the domain `Campaign`. */
export function toCampaign(
  id: string,
  data: FirebaseFirestore.DocumentData,
): Campaign {
  return {
    id,
    advertiserId: String(data.advertiserId ?? ""),
    ...(data.contactEmail !== undefined
      ? { contactEmail: String(data.contactEmail) }
      : {}),
    adText: String(data.adText ?? ""),
    ...(data.destinationUrl !== undefined
      ? { destinationUrl: String(data.destinationUrl) }
      : {}),
    ...(data.brandName !== undefined ? { brandName: String(data.brandName) } : {}),
    ...(data.brandIconDataUrl !== undefined
      ? { brandIconDataUrl: String(data.brandIconDataUrl) }
      : {}),
    publicOnLeaderboard: data.publicOnLeaderboard !== false,
    cpmCents: Number(data.cpmCents ?? 0),
    budgetCents: Number(data.budgetCents ?? 0),
    status: data.status as CampaignStatus,
    createdAtMs: Number(data.createdAtMs ?? 0),
  };
}

/** Maps a `ledgerEntries/{entryId}` document to the domain `LedgerEntry`. */
export function toLedgerEntry(
  id: string,
  data: FirebaseFirestore.DocumentData,
): LedgerEntry {
  return {
    entryId: String(data.entryId ?? id),
    campaignId: String(data.campaignId ?? ""),
    developerId: String(data.developerId ?? ""),
    revenueMicrocents: Number(data.revenueMicrocents ?? 0),
    developerCreditCents: Number(data.developerCreditCents ?? 0),
    spinshareRetentionMicrocents: Number(data.spinshareRetentionMicrocents ?? 0),
  };
}
