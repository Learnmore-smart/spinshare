/**
 * IP intelligence (anti-fraud Tier 2b): classify whether a caller IP belongs to
 * a datacenter / hosting provider. Impressions from cloud ranges (AWS, GCP,
 * Hetzner, …) are almost never real interactive Claude Code users, so a hit is a
 * strong — but never standalone — input to the composite suspicion score.
 *
 * The matching MECHANISM (parse IPv4 → uint32, test against CIDR ranges via
 * binary search) is the durable part and is fully tested. The default range
 * table is a small, conservative SEED: production should replace
 * {@link DEFAULT_DATACENTER_CIDRS} with a bundled, regularly-refreshed ip2asn /
 * hosting dataset (still offline — no network on the hot path). Because a
 * datacenter hit alone only reaches the "review" band (never "suppress"), a
 * stale or imperfect range here cannot, by itself, cost a legitimate user money.
 *
 * IPv6 is treated as "unknown" (not datacenter) for now — conservative.
 */

/** A datacenter range as an inclusive [startInt, endInt] pair of uint32s. */
export interface Ipv4Range {
  start: number;
  end: number;
}

/** Parses a dotted-quad IPv4 string to a uint32, or null if not valid IPv4. */
export function ipv4ToInt(ip: string): number | null {
  const trimmed = ip.trim();
  // Reject IPv6 / anything with non-IPv4 characters early.
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    return null;
  }
  const parts = trimmed.split(".");
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }
  // Force unsigned 32-bit.
  return value >>> 0;
}

/** Converts a CIDR string (e.g. "13.32.0.0/15") to an inclusive range, or null. */
export function cidrToRange(cidr: string): Ipv4Range | null {
  const [ip, bitsRaw] = cidr.trim().split("/");
  if (ip === undefined || bitsRaw === undefined) {
    return null;
  }
  const base = ipv4ToInt(ip);
  const bits = Number(bitsRaw);
  if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return null;
  }
  if (bits === 0) {
    return { start: 0, end: 0xffffffff };
  }
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  const start = (base & mask) >>> 0;
  const end = (start + (2 ** (32 - bits) - 1)) >>> 0;
  return { start, end };
}

/**
 * Builds a sorted, range-checked table from CIDR strings (invalid entries are
 * dropped). Pre-sort once at module load so {@link isDatacenterIp} can binary
 * search.
 */
export function buildRangeTable(cidrs: readonly string[]): Ipv4Range[] {
  return cidrs
    .map((c) => cidrToRange(c))
    .filter((r): r is Ipv4Range => r !== null)
    .sort((a, b) => a.start - b.start);
}

/**
 * Seed datacenter/hosting CIDRs. Intentionally small and conservative — REPLACE
 * with a bundled ip2asn/hosting dataset in production. Entries chosen from
 * long-stable, broadly-published cloud allocations.
 */
export const DEFAULT_DATACENTER_CIDRS: readonly string[] = [
  // AWS (publicly published, long-stable blocks)
  "13.32.0.0/15",
  "52.0.0.0/11",
  "54.224.0.0/12",
  // Google Cloud
  "34.64.0.0/10",
  "35.184.0.0/13",
  // Microsoft Azure
  "20.33.0.0/16",
  "40.64.0.0/10",
  // DigitalOcean
  "159.65.0.0/16",
  "165.227.0.0/16",
  // Hetzner
  "5.9.0.0/16",
  "88.198.0.0/16",
  // OVH
  "51.38.0.0/16",
  // Linode/Akamai
  "139.162.0.0/16",
];

const DEFAULT_RANGE_TABLE = buildRangeTable(DEFAULT_DATACENTER_CIDRS);

/**
 * Returns true when `ip` falls in a known datacenter/hosting range. Binary
 * search over the pre-sorted table; O(log n). IPv6 / unparseable → false.
 */
export function isDatacenterIp(
  ip: string | null | undefined,
  table: readonly Ipv4Range[] = DEFAULT_RANGE_TABLE,
): boolean {
  if (!ip) {
    return false;
  }
  const value = ipv4ToInt(ip);
  if (value === null) {
    return false;
  }
  let lo = 0;
  let hi = table.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const range = table[mid]!;
    if (value < range.start) {
      hi = mid - 1;
    } else if (value > range.end) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}
