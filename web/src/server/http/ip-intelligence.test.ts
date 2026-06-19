import { describe, expect, it } from "vitest";

import {
  buildRangeTable,
  cidrToRange,
  ipv4ToInt,
  isDatacenterIp,
} from "./ip-intelligence";

describe("ipv4ToInt", () => {
  it("parses valid dotted-quad addresses", () => {
    expect(ipv4ToInt("0.0.0.0")).toBe(0);
    expect(ipv4ToInt("255.255.255.255")).toBe(0xffffffff);
    expect(ipv4ToInt("1.2.3.4")).toBe(0x01020304);
  });

  it("rejects invalid / non-IPv4 input", () => {
    for (const bad of ["", "1.2.3", "256.0.0.1", "1.2.3.4.5", "::1", "abc", "1.2.3.4 "]) {
      // (trailing space is trimmed; "1.2.3.4 " should still parse)
      if (bad === "1.2.3.4 ") continue;
      expect(ipv4ToInt(bad)).toBeNull();
    }
    expect(ipv4ToInt("1.2.3.4 ")).toBe(0x01020304);
  });
});

describe("cidrToRange", () => {
  it("expands a /24 to its 256-address inclusive range", () => {
    expect(cidrToRange("203.0.113.0/24")).toEqual({
      start: ipv4ToInt("203.0.113.0"),
      end: ipv4ToInt("203.0.113.255"),
    });
  });

  it("normalizes a non-aligned base to the network address", () => {
    expect(cidrToRange("10.0.0.5/30")).toEqual({
      start: ipv4ToInt("10.0.0.4"),
      end: ipv4ToInt("10.0.0.7"),
    });
  });

  it("handles /32 and /0 and rejects junk", () => {
    expect(cidrToRange("8.8.8.8/32")).toEqual({
      start: ipv4ToInt("8.8.8.8"),
      end: ipv4ToInt("8.8.8.8"),
    });
    expect(cidrToRange("0.0.0.0/0")).toEqual({ start: 0, end: 0xffffffff });
    expect(cidrToRange("not-a-cidr")).toBeNull();
    expect(cidrToRange("1.2.3.4/33")).toBeNull();
  });
});

describe("isDatacenterIp", () => {
  // Deterministic test table independent of the production seed.
  const table = buildRangeTable(["100.64.0.0/10", "198.51.100.0/24"]);

  it("matches addresses inside the configured ranges", () => {
    expect(isDatacenterIp("100.64.0.1", table)).toBe(true);
    expect(isDatacenterIp("100.127.255.255", table)).toBe(true);
    expect(isDatacenterIp("198.51.100.42", table)).toBe(true);
  });

  it("rejects addresses outside the ranges, IPv6, and empties", () => {
    expect(isDatacenterIp("203.0.113.1", table)).toBe(false);
    expect(isDatacenterIp("100.128.0.0", table)).toBe(false); // just past /10
    expect(isDatacenterIp("2001:db8::1", table)).toBe(false);
    expect(isDatacenterIp(null, table)).toBe(false);
    expect(isDatacenterIp(undefined, table)).toBe(false);
  });

  it("uses the default seed table when none is supplied (smoke)", () => {
    // A clearly non-datacenter documentation address is not flagged.
    expect(isDatacenterIp("203.0.113.7")).toBe(false);
  });
});
