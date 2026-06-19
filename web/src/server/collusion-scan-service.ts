/**
 * Cross-entity collusion / account-farm scan (anti-fraud Tier 2c).
 *
 * Pure clustering over the impression-activity log: relationships a per-userId
 * rule is blind to. The strongest network edge available today is a shared
 * `ipHash` carrying many distinct earning accounts (a farm signature). Accounts
 * are unioned across shared IPs (transitive), and connected components whose
 * shared IP(s) exceed the fan-out threshold are flagged.
 *
 * This is a SCORE/REVIEW producer, not an executioner: shared NAT/CGNAT egress
 * can legitimately carry several users, so the threshold is conservative and the
 * decisive action (voiding held earnings) belongs to the Tier 3 earnings-hold.
 * Extension points: `uaHash` edges (weaker), and — once Tier 3b lands — the
 * dispositive shared payout-fingerprint edge.
 */

import { IP_FANOUT_THRESHOLD } from "@spinshare/core";
import type { ImpressionActivity } from "./ports/activity-repository";

export interface CollusionScanInput {
  activities: readonly ImpressionActivity[];
  /** Distinct accounts on one ipHash at/above which it is a farm edge. */
  fanoutThreshold?: number;
}

export interface CollusionCluster {
  /** Developer ids in this connected component (sorted, stable). */
  developerIds: string[];
  /** The shared ipHashes that triggered the flag. */
  sharedIpHashes: string[];
}

export interface CollusionScanResult {
  clusters: CollusionCluster[];
  /** Flat, sorted list of all developer ids in any flagged cluster. */
  flaggedDeveloperIds: string[];
}

/** Minimal union-find (disjoint set) over string keys. */
class DisjointSet {
  private readonly parent = new Map<string, string>();

  private find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      return x;
    }
    // DSU invariant: every traversed node has a parent entry, so the casts are
    // safe (nodes are only introduced via `find`, which seeds them).
    let root = x;
    while (this.parent.get(root) !== root) {
      const parent = this.parent.get(root) as string;
      const grandparent = this.parent.get(parent) as string;
      this.parent.set(root, grandparent); // path halving
      root = parent;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }

  /** Groups all known members by their representative root. */
  groups(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      const list = out.get(root) ?? [];
      list.push(key);
      out.set(root, list);
    }
    return out;
  }
}

/**
 * Scans impression activities for account-farm clusters. Pure and
 * deterministic: equal input yields equal (sorted) output.
 */
export function scanForCollusion(
  input: CollusionScanInput,
): CollusionScanResult {
  const fanoutThreshold = input.fanoutThreshold ?? IP_FANOUT_THRESHOLD;

  // 1. ipHash → set of distinct developer ids.
  const devsByIp = new Map<string, Set<string>>();
  for (const a of input.activities) {
    if (!a.ipHash || !a.developerId) continue;
    const set = devsByIp.get(a.ipHash) ?? new Set<string>();
    set.add(a.developerId);
    devsByIp.set(a.ipHash, set);
  }

  // 2. Union developers that share a high-fan-out ipHash; remember the edges.
  const dsu = new DisjointSet();
  const triggeringIpByDev = new Map<string, Set<string>>();
  for (const [ipHash, devs] of devsByIp) {
    if (devs.size < fanoutThreshold) continue;
    const members = [...devs];
    for (const dev of members) {
      dsu.union(members[0]!, dev);
      const ips = triggeringIpByDev.get(dev) ?? new Set<string>();
      ips.add(ipHash);
      triggeringIpByDev.set(dev, ips);
    }
  }

  // 3. Materialize connected components into clusters.
  const clusters: CollusionCluster[] = [];
  const flagged = new Set<string>();
  for (const [, members] of dsu.groups()) {
    const developerIds = [...members].sort();
    const sharedIpHashes = new Set<string>();
    for (const dev of developerIds) {
      flagged.add(dev);
      for (const ip of triggeringIpByDev.get(dev) ?? []) sharedIpHashes.add(ip);
    }
    clusters.push({
      developerIds,
      sharedIpHashes: [...sharedIpHashes].sort(),
    });
  }

  clusters.sort((a, b) => b.developerIds.length - a.developerIds.length);
  return {
    clusters,
    flaggedDeveloperIds: [...flagged].sort(),
  };
}
