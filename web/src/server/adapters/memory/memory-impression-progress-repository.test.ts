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
