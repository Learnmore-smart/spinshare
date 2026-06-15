import { describe, expect, it } from "vitest";

import { buildBidChartData } from "./page";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("buildBidChartData", () => {
  it("pads a single snapshot across the full 24h window", () => {
    const nowMs = Date.parse("2026-06-14T22:05:00.000Z");
    const series = buildBidChartData(
      [{ atMs: nowMs, topCpmCents: 3000 }],
      "24h",
      nowMs,
    );

    expect(series).not.toBeNull();
    expect(series!.windowStartMs).toBe(nowMs - DAY_MS);
    expect(series!.windowEndMs).toBe(nowMs);
    expect(series!.points[0]?.atMs).toBe(nowMs - DAY_MS);
    expect(series!.points.at(-1)?.atMs).toBe(nowMs);
    expect(series!.points.every((point) => point.bid === 30)).toBe(true);
  });

  it("keeps bid steps when history changes", () => {
    const nowMs = Date.parse("2026-06-14T22:05:00.000Z");
    const series = buildBidChartData(
      [
        { atMs: nowMs - 2 * 60 * 60 * 1000, topCpmCents: 2000 },
        { atMs: nowMs - 30 * 60 * 1000, topCpmCents: 3000 },
      ],
      "24h",
      nowMs,
    );

    expect(series).not.toBeNull();
    expect(series!.points.map((point) => point.bid)).toEqual([20, 20, 30, 30]);
    expect(series!.points[0]?.atMs).toBe(nowMs - DAY_MS);
    expect(series!.points.at(-1)?.atMs).toBe(nowMs);
  });
});
