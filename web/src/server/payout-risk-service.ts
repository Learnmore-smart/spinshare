/**
 * Payout risk gate (anti-fraud Tier 3c — prove-before-pay).
 *
 * Builds the `assessRisk` hook the {@link withdrawBalance payout service} calls
 * at the withdrawal boundary. The strongest available signal reuses the Tier 2c
 * cross-entity collusion scan: if the developer falls inside an account-farm
 * cluster (many earning accounts sharing a high-fan-out IP) over the recent
 * window, their withdrawal is blocked for review rather than paid out.
 *
 * This is the last line before money leaves the platform — complementary to the
 * Tier 3a earnings-hold (which claws back still-held earnings). The hold catches
 * fraud while earnings are immature; this gate catches a farm that nonetheless
 * reached a matured, eligible balance.
 *
 * Fail-open: any internal error (e.g. the activity store is unavailable) returns
 * `block: false`. A money-protection gate must never strand a legitimate
 * developer's earnings on an infrastructure fault — residual fraud risk is still
 * covered by the hold/clawback and by human review of the scan output.
 */

import { IP_FANOUT_WINDOW_SECONDS } from "@spinshare/core";

import { scanForCollusion } from "./collusion-scan-service";
import type { ActivityRepository } from "./ports";
import type { PayoutRiskVerdict } from "./payout-service";

/** Dependencies for the payout risk assessor. */
export interface PayoutRiskDeps {
  /** Impression-activity source for the collusion scan. */
  activities: ActivityRepository;
  /** Clock override for deterministic tests. */
  nowMs?: () => number;
}

/** `reason` recorded when a developer is blocked for collusion-cluster membership. */
export const COLLUSION_CLUSTER_REASON = "collusion_cluster" as const;

/**
 * Builds the payout `assessRisk` hook. Returns a function that blocks a
 * developer found inside a flagged collusion cluster over the recent fan-out
 * window, and fails open on any error.
 */
export function buildPayoutRiskAssessor(
  deps: PayoutRiskDeps,
): (developerId: string) => Promise<PayoutRiskVerdict> {
  return async (developerId: string): Promise<PayoutRiskVerdict> => {
    try {
      const nowMs = deps.nowMs?.() ?? Date.now();
      const sinceMs = nowMs - IP_FANOUT_WINDOW_SECONDS * 1000;
      const recent = await deps.activities.listRecentImpressions(sinceMs);
      const { flaggedDeveloperIds } = scanForCollusion({ activities: recent });
      if (flaggedDeveloperIds.includes(developerId)) {
        return { block: true, reason: COLLUSION_CLUSTER_REASON };
      }
      return { block: false };
    } catch (error) {
      // Fail-open: never block a legitimate payout on an infra fault.
      console.warn("[spinshare] payout risk assessment failed (fail-open)", error);
      return { block: false };
    }
  };
}
