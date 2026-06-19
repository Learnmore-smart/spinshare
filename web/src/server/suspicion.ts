/**
 * Composite suspicion score (anti-fraud Tier 2a).
 *
 * Pure, deterministic fuser: takes the per-impression signals available at
 * settlement and returns a score + a graduated band. Individual signals are
 * weak and individually defeatable, so NONE of them bans on its own — the value
 * is the fused score, which forces an attacker to defeat several signals at once
 * and, critically, leaks nothing back (the caller maps `suppress` onto the
 * existing indistinguishable `shadowBanned` settlement).
 *
 * Design notes:
 *   - **No standalone IP bans.** Shared NAT/CGNAT/VPN egress legitimately
 *     carries several of our users, so per-IP fan-out / velocity only push the
 *     score; `suppress` requires a *farm-shaped combination* (many accounts AND
 *     a high rate on one IP), or a datacenter origin plus corroboration.
 *   - **Tunable + rotatable.** Weights/thresholds are parameters with
 *     conservative defaults; production should inject rotated values from config
 *     so the boundary cannot be mapped by sacrificial canary accounts.
 *   - **Extensible.** New signals (datacenter ASN, ad→track latency variance,
 *     viewDuration shape, CTR anomaly, account age) plug into the same shape as
 *     they come online; today only the network signals from Tier 2b are wired.
 */

import { IP_FANOUT_THRESHOLD, VELOCITY_THRESHOLD } from "@spinshare/core";

export interface SuspicionSignals {
  /** Distinct earning accounts seen on this IP within the fan-out window. */
  ipFanout?: number;
  /** Impressions from this IP within the per-IP velocity window. */
  ipVelocity?: number;
  /** True when the caller IP resolves to a known datacenter/hosting ASN. */
  datacenterHit?: boolean;
}

export type SuspicionBand = "ok" | "review" | "suppress";

export interface SuspicionResult {
  score: number;
  band: SuspicionBand;
  /** Human-readable contributors, for offline review (never returned to clients). */
  reasons: string[];
}

export interface SuspicionConfig {
  /** Points per distinct account on one IP beyond `IP_FANOUT_THRESHOLD`. */
  fanoutWeight: number;
  /** Points per impression on one IP beyond the per-IP velocity threshold. */
  velocityWeight: number;
  /** Per-IP velocity (impressions/window) beyond which points accrue. */
  velocityThreshold: number;
  /** Flat points added when the IP is a datacenter/hosting origin. */
  datacenterWeight: number;
  /** Score at/above which the impression is flagged for review (not suppressed). */
  reviewAt: number;
  /** Score at/above which the impression is silently suppressed. */
  suppressAt: number;
}

/**
 * Conservative defaults. Calibrated so per-IP signals ALONE rarely reach
 * `suppress` (protecting shared egress) while a clear farm pattern — say ~10
 * accounts churning on one IP, or a handful on a datacenter IP — does. Override
 * in production with rotated values.
 */
export const DEFAULT_SUSPICION_CONFIG: SuspicionConfig = {
  fanoutWeight: 1,
  velocityWeight: 0.1,
  velocityThreshold: VELOCITY_THRESHOLD, // 30 impressions/window on one IP
  datacenterWeight: 4,
  reviewAt: 3,
  suppressAt: 8,
};

function clampNonNegative(value: number | undefined): number {
  return typeof value === "number" && value > 0 ? value : 0;
}

/**
 * Fuses the given signals into a score + band. Pure and deterministic; never
 * throws. With no signals it returns `{ score: 0, band: "ok" }`.
 */
export function scoreImpression(
  signals: SuspicionSignals,
  config: SuspicionConfig = DEFAULT_SUSPICION_CONFIG,
): SuspicionResult {
  const reasons: string[] = [];
  let score = 0;

  const fanout = clampNonNegative(signals.ipFanout);
  if (fanout > IP_FANOUT_THRESHOLD) {
    const pts = (fanout - IP_FANOUT_THRESHOLD) * config.fanoutWeight;
    score += pts;
    reasons.push(`ip_fanout=${fanout} (+${pts.toFixed(2)})`);
  }

  const velocity = clampNonNegative(signals.ipVelocity);
  if (velocity > config.velocityThreshold) {
    const pts = (velocity - config.velocityThreshold) * config.velocityWeight;
    score += pts;
    reasons.push(`ip_velocity=${velocity} (+${pts.toFixed(2)})`);
  }

  if (signals.datacenterHit === true) {
    score += config.datacenterWeight;
    reasons.push(`datacenter_ip (+${config.datacenterWeight})`);
  }

  const band: SuspicionBand =
    score >= config.suppressAt
      ? "suppress"
      : score >= config.reviewAt
        ? "review"
        : "ok";

  return { score, band, reasons };
}
