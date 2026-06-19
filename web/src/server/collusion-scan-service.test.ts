import { describe, expect, it } from "vitest";

import { scanForCollusion } from "./collusion-scan-service";
import type { ImpressionActivity } from "./ports/activity-repository";

function impression(
  developerId: string,
  ipHash: string,
  id: string,
): ImpressionActivity {
  return {
    activityId: id,
    campaignId: "cmp_1",
    status: "credited",
    viewDurationMs: 3000,
    createdAtMs: 1,
    developerId,
    ipHash,
  };
}

describe("scanForCollusion", () => {
  it("flags a single IP shared by enough distinct accounts (farm)", () => {
    const activities = [
      impression("dev_1", "ip_a", "a1"),
      impression("dev_2", "ip_a", "a2"),
      impression("dev_3", "ip_a", "a3"), // 3 distinct on ip_a >= threshold(3)
    ];
    const result = scanForCollusion({ activities });
    expect(result.flaggedDeveloperIds).toEqual(["dev_1", "dev_2", "dev_3"]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]!.sharedIpHashes).toEqual(["ip_a"]);
  });

  it("does not flag a shared IP below the fan-out threshold", () => {
    const activities = [
      impression("dev_1", "ip_a", "a1"),
      impression("dev_2", "ip_a", "a2"), // only 2 distinct
    ];
    expect(scanForCollusion({ activities }).flaggedDeveloperIds).toEqual([]);
  });

  it("merges clusters transitively across shared IPs", () => {
    // dev_2 bridges ip_a and ip_b → one cluster of 4.
    const activities = [
      impression("dev_1", "ip_a", "a1"),
      impression("dev_2", "ip_a", "a2"),
      impression("dev_3", "ip_a", "a3"),
      impression("dev_2", "ip_b", "b1"),
      impression("dev_4", "ip_b", "b2"),
      impression("dev_5", "ip_b", "b3"),
    ];
    const result = scanForCollusion({ activities });
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]!.developerIds).toEqual([
      "dev_1",
      "dev_2",
      "dev_3",
      "dev_4",
      "dev_5",
    ]);
    expect(result.clusters[0]!.sharedIpHashes).toEqual(["ip_a", "ip_b"]);
  });

  it("ignores activities lacking ipHash or developerId", () => {
    const activities: ImpressionActivity[] = [
      { activityId: "x", campaignId: "c", status: "credited", viewDurationMs: 3000, createdAtMs: 1 },
      impression("dev_1", "ip_a", "a1"),
    ];
    expect(scanForCollusion({ activities }).flaggedDeveloperIds).toEqual([]);
  });

  it("honors a custom fan-out threshold", () => {
    const activities = [
      impression("dev_1", "ip_a", "a1"),
      impression("dev_2", "ip_a", "a2"),
    ];
    expect(
      scanForCollusion({ activities, fanoutThreshold: 2 }).flaggedDeveloperIds,
    ).toEqual(["dev_1", "dev_2"]);
  });
});
