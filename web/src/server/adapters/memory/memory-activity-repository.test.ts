import { describe, expect, it } from "vitest";

import type { ImpressionActivity } from "../../ports/activity-repository";
import { MemoryActivityRepository } from "./memory-activity-repository";

const baseActivity: ImpressionActivity = {
  activityId: "activity_1",
  campaignId: "cmp_1",
  advertiserId: "adv_1",
  developerId: "dev_1",
  status: "credited",
  viewDurationMs: 3000,
  revenueMicrocents: 3000,
  developerCreditCents: 2,
  createdAtMs: 1000,
};

describe("MemoryActivityRepository", () => {
  it("records activities idempotently by activity id", async () => {
    const repo = new MemoryActivityRepository();

    await repo.record(baseActivity);
    await repo.record({ ...baseActivity, developerCreditCents: 999 });

    expect(await repo.listByDeveloper("dev_1")).toEqual([baseActivity]);
  });

  it("lists activities by developer in recording order", async () => {
    const repo = new MemoryActivityRepository();

    await repo.record(baseActivity);
    await repo.record({
      ...baseActivity,
      activityId: "activity_2",
      campaignId: "cmp_2",
      status: "tooShort",
      viewDurationMs: 1200,
      developerCreditCents: 0,
      createdAtMs: 2000,
    });
    await repo.record({
      ...baseActivity,
      activityId: "activity_3",
      developerId: "dev_2",
      createdAtMs: 3000,
    });

    expect(await repo.listByDeveloper("dev_1")).toEqual([
      baseActivity,
      {
        ...baseActivity,
        activityId: "activity_2",
        campaignId: "cmp_2",
        status: "tooShort",
        viewDurationMs: 1200,
        developerCreditCents: 0,
        createdAtMs: 2000,
      },
    ]);
  });

  it("lists activities by campaign ids", async () => {
    const repo = new MemoryActivityRepository();

    await repo.record(baseActivity);
    await repo.record({
      ...baseActivity,
      activityId: "activity_2",
      campaignId: "cmp_2",
      developerId: "dev_2",
      createdAtMs: 2000,
    });
    await repo.record({
      ...baseActivity,
      activityId: "activity_3",
      campaignId: "cmp_3",
      developerId: "dev_3",
      createdAtMs: 3000,
    });

    expect(await repo.listByCampaignIds(["cmp_1", "cmp_3"])).toEqual([
      baseActivity,
      {
        ...baseActivity,
        activityId: "activity_3",
        campaignId: "cmp_3",
        developerId: "dev_3",
        createdAtMs: 3000,
      },
    ]);
  });

  it("lists advertiser events by checkout session id", async () => {
    const repo = new MemoryActivityRepository();

    await repo.record(baseActivity);
    await repo.record({
      activityId: "checkout-started",
      campaignId: "cmp_1",
      advertiserId: "adv_1",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_1",
      createdAtMs: 2000,
    });
    await repo.record({
      activityId: "checkout-other",
      campaignId: "cmp_2",
      advertiserId: "adv_2",
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 600,
      amountUsd: "6.00",
      checkoutSessionId: "cs_2",
      createdAtMs: 3000,
    });

    await expect(repo.listByCheckoutSessionId("cs_1")).resolves.toEqual([
      {
        activityId: "checkout-started",
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        type: "advertiser_event",
        status: "checkoutStarted",
        amountCents: 500,
        amountUsd: "5.00",
        checkoutSessionId: "cs_1",
        createdAtMs: 2000,
      },
    ]);
  });
});
