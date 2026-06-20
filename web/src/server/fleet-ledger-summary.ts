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

  for (const entry of entries) {
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
  };
}
