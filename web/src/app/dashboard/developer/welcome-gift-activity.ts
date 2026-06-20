import type { ActivityFeedSource } from "../activity-feed";
import type { LedgerActivityRow } from "./summarize-ledger";

/** Adapt the durable signup-bonus row into the pinned Recent credit source. */
export function welcomeGiftActivityFromRows(
  rows: readonly LedgerActivityRow[],
): ActivityFeedSource | undefined {
  const bonus = rows.find((row) => row.ledgerType === "signup_bonus");
  if (bonus?.createdAtMs === undefined) return undefined;

  return {
    activityId: bonus.entryId,
    campaignId: "—",
    type: "welcome_gift",
    status: "credited",
    amountCents: bonus.developerCreditCents,
    amountUsd: bonus.developerCreditUsd,
    createdAtMs: bonus.createdAtMs,
  };
}
