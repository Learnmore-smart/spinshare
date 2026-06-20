/**
 * Shared {@link ActivityRepository} CONTRACT (adapter-parity foundation).
 *
 * The activity log is where Firestore field-mapping drift is most likely to bite
 * silently: the anti-fraud network signals (`ipHash`/`uaHash`, Tier 1b/2c) and
 * the money fields (`revenueMicrocents`/`developerCreditCents`) must round-trip
 * identically through the memory store (which keeps the object verbatim) and the
 * Firestore `toActivity` mapper (which reconstructs each field by hand). If the
 * mapper ever drops a field, the collusion scan / fraud cron silently goes blind
 * in production while the memory-backed tests stay green — exactly the class of
 * bug this contract exists to prevent.
 */

import { describe, expect, it } from "vitest";

import type { ActivityRepository, ImpressionActivity } from "../activity-repository";

export interface ActivityRepositoryContractHarness {
  makeRepo: () => ActivityRepository | Promise<ActivityRepository>;
  /** Process-unique id for `label` (Firestore shares one collection). */
  uid: (label: string) => string;
}

export function runActivityRepositoryContract(
  name: string,
  harness: ActivityRepositoryContractHarness,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skip : describe;

  suite(`ActivityRepository contract — ${name}`, () => {
    function impression(
      overrides: Partial<ImpressionActivity> & { activityId: string },
    ): ImpressionActivity {
      return {
        campaignId: harness.uid("cmp"),
        type: "impression_attempt",
        status: "credited",
        viewDurationMs: 3_000,
        createdAtMs: 1_000,
        ...overrides,
      };
    }

    it("record is idempotent by activityId", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("imp");
      const developerId = harness.uid("dev");
      await repo.record(impression({ activityId: id, developerId, status: "credited" }));
      // A second record with the same id must NOT overwrite or duplicate.
      await repo.record(
        impression({ activityId: id, developerId, status: "tooShort" }),
      );

      const rows = await repo.listByDeveloper(developerId);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("credited");
    });

    it("round-trips ipHash / uaHash / money fields through listRecentImpressions", async () => {
      const repo = await harness.makeRepo();
      const id = harness.uid("imp");
      const developerId = harness.uid("dev");
      await repo.record(
        impression({
          activityId: id,
          developerId,
          ipHash: "ip_abc",
          uaHash: "ua_xyz",
          revenueMicrocents: 30_000,
          developerCreditCents: 21,
          createdAtMs: 5_000,
        }),
      );

      const recent = await repo.listRecentImpressions(0);
      const found = recent.find((a) => a.activityId === id);
      expect(found).toBeDefined();
      expect(found?.ipHash).toBe("ip_abc");
      expect(found?.uaHash).toBe("ua_xyz");
      expect(found?.developerId).toBe(developerId);
      expect(found?.revenueMicrocents).toBe(30_000);
      expect(found?.developerCreditCents).toBe(21);
    });

    it("listRecentImpressions filters by sinceMs and impression type only", async () => {
      const repo = await harness.makeRepo();
      const dev = harness.uid("dev");
      const oldId = harness.uid("old");
      const newId = harness.uid("new");
      await repo.record(
        impression({ activityId: oldId, developerId: dev, createdAtMs: 100 }),
      );
      await repo.record(
        impression({ activityId: newId, developerId: dev, createdAtMs: 10_000 }),
      );
      // A non-impression (advertiser) event must never appear.
      await repo.record({
        activityId: harness.uid("adv"),
        campaignId: harness.uid("cmp"),
        type: "advertiser_event",
        status: "budgetFunded",
        createdAtMs: 10_000,
        advertiserId: harness.uid("adv"),
      });

      const recent = await repo.listRecentImpressions(5_000);
      const ids = recent.map((a) => a.activityId);
      expect(ids).toContain(newId);
      expect(ids).not.toContain(oldId); // older than sinceMs
      // Only impression rows come back.
      expect(recent.every((a) => a.type === undefined || a.type === "impression_attempt")).toBe(
        true,
      );
    });

    it("listByCheckoutSessionId returns only that session's advertiser events", async () => {
      const repo = await harness.makeRepo();
      const session = harness.uid("cs");
      const matchId = harness.uid("adv_match");
      await repo.record({
        activityId: matchId,
        campaignId: harness.uid("cmp"),
        type: "advertiser_event",
        status: "checkoutStarted",
        createdAtMs: 1_000,
        advertiserId: harness.uid("adv"),
        checkoutSessionId: session,
      });
      await repo.record({
        activityId: harness.uid("adv_other"),
        campaignId: harness.uid("cmp"),
        type: "advertiser_event",
        status: "checkoutStarted",
        createdAtMs: 1_000,
        advertiserId: harness.uid("adv"),
        checkoutSessionId: harness.uid("cs_other"),
      });

      const rows = await repo.listByCheckoutSessionId(session);
      expect(rows.map((r) => r.activityId)).toEqual([matchId]);
    });
  });
}
