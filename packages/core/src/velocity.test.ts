// Feature: spinshare-ad-exchange
//
// Unit tests for the anti-fraud earnings-hold policy helpers (Tier 3a/3d) and
// the load-bearing invariant that every hold window outlasts the fraud-scan
// interval (so flagged earnings can always be voided before they mature).

import { describe, expect, it } from "vitest";

import {
  EARNINGS_HOLD_WINDOW_SECONDS,
  HELD_LOT_BUCKET_MS,
  IP_FANOUT_WINDOW_SECONDS,
  NEW_ACCOUNT_AGE_THRESHOLD_SECONDS,
  NEW_ACCOUNT_HOLD_WINDOW_SECONDS,
  earningsHoldWindowSecondsForAccountAge,
  heldLotBucketMs,
} from "./velocity";

describe("earningsHoldWindowSecondsForAccountAge (Tier 3d)", () => {
  it("holds a young account's earnings for the longer new-account window", () => {
    const oneDayMs = 86_400 * 1_000;
    expect(earningsHoldWindowSecondsForAccountAge(oneDayMs)).toBe(
      NEW_ACCOUNT_HOLD_WINDOW_SECONDS,
    );
  });

  it("uses the standard window for an established account", () => {
    const thirtyDaysMs = 30 * 86_400 * 1_000;
    expect(earningsHoldWindowSecondsForAccountAge(thirtyDaysMs)).toBe(
      EARNINGS_HOLD_WINDOW_SECONDS,
    );
  });

  it("treats unknown age (legacy records) as established — never penalised", () => {
    expect(earningsHoldWindowSecondsForAccountAge(undefined)).toBe(
      EARNINGS_HOLD_WINDOW_SECONDS,
    );
  });

  it("treats exactly the threshold age as established (boundary)", () => {
    expect(
      earningsHoldWindowSecondsForAccountAge(
        NEW_ACCOUNT_AGE_THRESHOLD_SECONDS * 1_000,
      ),
    ).toBe(EARNINGS_HOLD_WINDOW_SECONDS);
  });
});

describe("earnings-hold invariants", () => {
  it("every hold window strictly outlasts the fraud-scan interval", () => {
    // Load-bearing: a farm must never mature + withdraw before a scan can flag
    // it. The scan inspects the last IP_FANOUT_WINDOW of activity.
    expect(EARNINGS_HOLD_WINDOW_SECONDS).toBeGreaterThan(IP_FANOUT_WINDOW_SECONDS);
    expect(NEW_ACCOUNT_HOLD_WINDOW_SECONDS).toBeGreaterThan(
      IP_FANOUT_WINDOW_SECONDS,
    );
    expect(NEW_ACCOUNT_HOLD_WINDOW_SECONDS).toBeGreaterThanOrEqual(
      EARNINGS_HOLD_WINDOW_SECONDS,
    );
  });
});

describe("heldLotBucketMs", () => {
  it("rounds a maturation time up to the next hour bucket", () => {
    expect(heldLotBucketMs(HELD_LOT_BUCKET_MS)).toBe(HELD_LOT_BUCKET_MS);
    expect(heldLotBucketMs(HELD_LOT_BUCKET_MS + 1)).toBe(2 * HELD_LOT_BUCKET_MS);
    expect(heldLotBucketMs(1)).toBe(HELD_LOT_BUCKET_MS);
  });

  it("never rounds down (earnings never mature early)", () => {
    for (const t of [1, 12_345, HELD_LOT_BUCKET_MS - 1, 9_999_999]) {
      expect(heldLotBucketMs(t)).toBeGreaterThanOrEqual(t);
    }
  });
});
