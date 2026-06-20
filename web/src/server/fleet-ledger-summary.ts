import type { LedgerEntry } from "@spinshare/core";

import type { FleetLedgerSummary } from "./ports/ledger-repository";

function startOfUtcDayMs(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function summarizeFleetFromEntries(
  entries: readonly LedgerEntry[],
  nowMs = Date.now(),
): FleetLedgerSummary {
  const dayStart = startOfUtcDayMs(nowMs);
  let totalCreditedImpressions = 0;
  let totalDeveloperCreditCents = 0;
  let impressionsToday = 0;
  let developerCreditsTodayCents = 0;
  // Every developer leaves a durable footprint here — an impression row or the
  // sign-up bonus row written at join time — so the distinct count survives a
  // user-doc deletion or a device/JWT credit that never minted a durable
  // `users/{id}` record. Counted before the impression-only skip below so a
  // developer holding only a sign-up bonus still counts.
  const developerIds = new Set<string>();

  for (const entry of entries) {
    if (entry.developerId.length > 0) {
      developerIds.add(entry.developerId);
    }
    if (entry.type === "signup_bonus" || entry.campaignId.length === 0) {
      continue;
    }
    totalCreditedImpressions += 1;
    totalDeveloperCreditCents += entry.developerCreditCents;
    const createdAtMs = entry.createdAtMs ?? 0;
    if (createdAtMs >= dayStart) {
      impressionsToday += 1;
      developerCreditsTodayCents += entry.developerCreditCents;
    }
  }

  return {
    totalCreditedImpressions,
    totalDeveloperCreditCents,
    impressionsToday,
    developerCreditsTodayCents,
    distinctDevelopers: developerIds.size,
  };
}
