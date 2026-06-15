import { describe, expect, it } from "vitest";

import {
  msUntilNextUtcHour,
  msUntilOldestRollingHourCreditExpires,
  msUntilUtcMidnight,
  ROLLING_HOUR_MS,
} from "./utc-periods";

describe("msUntilOldestRollingHourCreditExpires", () => {
  const now = 1_700_000_000_000;

  it("returns null when no credits fall inside the rolling window", () => {
    expect(
      msUntilOldestRollingHourCreditExpires(
        [now - ROLLING_HOUR_MS - 1, now - ROLLING_HOUR_MS - 60_000],
        now,
      ),
    ).toBeNull();
    expect(msUntilOldestRollingHourCreditExpires([], now)).toBeNull();
  });

  it("counts down from the oldest in-window credit", () => {
    const oldest = now - 45 * 60_000;
    const newest = now - 5 * 60_000;
    expect(msUntilOldestRollingHourCreditExpires([newest, oldest], now)).toBe(
      15 * 60_000,
    );
  });

  it("never returns a negative duration", () => {
    const expiredEdge = now - ROLLING_HOUR_MS;
    expect(msUntilOldestRollingHourCreditExpires([expiredEdge], now)).toBe(0);
  });
});

describe("msUntilUtcMidnight", () => {
  it("returns time until the next UTC day boundary", () => {
    const noonUtc = Date.UTC(2024, 0, 15, 12, 0, 0);
    expect(msUntilUtcMidnight(noonUtc)).toBe(12 * 60 * 60 * 1000);
  });
});

describe("msUntilNextUtcHour", () => {
  it("returns time until the next UTC hour boundary", () => {
    const seventeenPastUtc = Date.UTC(2024, 0, 15, 0, 17, 0);
    expect(msUntilNextUtcHour(seventeenPastUtc)).toBe(43 * 60 * 1000);
  });
});
