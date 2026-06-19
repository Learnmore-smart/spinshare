import { describe, expect, it } from "vitest";

import { MemoryImpressionProgressRepository } from "./memory-impression-progress-repository";

describe("MemoryImpressionProgressRepository", () => {
  it("accumulates durations for the same developer and campaign", async () => {
    const repo = new MemoryImpressionProgressRepository();

    await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1000,
      nowMs: 10,
    });
    const progress = await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1500,
      nowMs: 20,
    });

    expect(progress).toEqual({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 2500,
      updatedAtMs: 20,
    });
    await expect(repo.getByDeveloper("dev_1")).resolves.toEqual(progress);
  });

  it("replaces pending progress when the campaign changes", async () => {
    const repo = new MemoryImpressionProgressRepository();

    await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_old",
      viewDurationMs: 1000,
      nowMs: 10,
    });
    const progress = await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_new",
      viewDurationMs: 750,
      nowMs: 20,
    });

    expect(progress).toMatchObject({
      developerId: "dev_1",
      campaignId: "cmp_new",
      accumulatedViewDurationMs: 750,
    });
  });

  it("stamps servedAtMs on serve and preserves it across track segments", async () => {
    const repo = new MemoryImpressionProgressRepository();

    // /api/ad serve: stamps the immutable serve time.
    await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 0,
      nowMs: 100,
      servedAtMs: 100,
    });
    // Track segments do not pass servedAtMs; it must be preserved.
    const progress = await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1500,
      nowMs: 200,
    });

    expect(progress).toEqual({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 1500,
      updatedAtMs: 200,
      servedAtMs: 100,
    });

    // Switching campaigns resets servedAtMs to the new serve (or undefined when
    // a track segment, not a serve, creates the record).
    const switched = await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_2",
      viewDurationMs: 500,
      nowMs: 300,
    });
    expect(switched.servedAtMs).toBeUndefined();
    expect(switched.accumulatedViewDurationMs).toBe(500);
  });

  it("leaves servedAtMs unset when no serve time is supplied", async () => {
    const repo = new MemoryImpressionProgressRepository();
    const progress = await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1000,
      nowMs: 10,
    });
    expect(progress).toEqual({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 1000,
      updatedAtMs: 10,
    });
  });

  it("clears pending progress for a developer", async () => {
    const repo = new MemoryImpressionProgressRepository();
    await repo.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1000,
      nowMs: 10,
    });

    await repo.clearDeveloper("dev_1");

    await expect(repo.getByDeveloper("dev_1")).resolves.toBeNull();
  });
});
