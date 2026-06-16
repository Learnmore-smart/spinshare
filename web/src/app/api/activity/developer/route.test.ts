import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MemoryActivityRepository,
  MockAuthProvider,
} from "@/server/adapters/memory";
import { getContainer, resetContainer } from "@/server/container";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

function activityRequest(token?: string, query = ""): Request {
  return new Request(`https://spinshare.test/api/activity/developer${query}`, {
    headers:
      token === undefined ? undefined : { authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  resetContainer();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  resetContainer();
});

describe("GET /api/activity/developer", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await GET(activityRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns only the authenticated developer's attempt activity entries", async () => {
    const container = getContainer();
    const activities = container.activities as MemoryActivityRepository;
    await activities.record({
      activityId: "activity-dev-1",
      campaignId: "cmp-1",
      developerId: "dev-1",
      advertiserId: "adv-1",
      status: "credited",
      viewDurationMs: 3000,
      revenueMicrocents: 30000,
      developerCreditCents: 2,
      createdAtMs: 1000,
    });
    await activities.record({
      activityId: "activity-dev-2",
      campaignId: "cmp-2",
      developerId: "dev-1",
      advertiserId: "adv-2",
      status: "tooShort",
      viewDurationMs: 1200,
      revenueMicrocents: 0,
      developerCreditCents: 0,
      createdAtMs: 2000,
    });
    await activities.record({
      activityId: "activity-other",
      campaignId: "cmp-3",
      developerId: "dev-2",
      advertiserId: "adv-3",
      status: "credited",
      viewDurationMs: 3000,
      revenueMicrocents: 30000,
      developerCreditCents: 2,
      createdAtMs: 3000,
    });
    const token = (container.auth as MockAuthProvider).mintToken("dev-1");

    const response = await GET(activityRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activities).toEqual([
      {
        activityId: "activity-dev-2",
        campaignId: "cmp-2",
        developerId: "dev-1",
        advertiserId: "adv-2",
        type: "impression_attempt",
        status: "tooShort",
        viewDurationMs: 1200,
        revenueMicrocents: 0,
        developerCreditCents: 0,
        developerCreditUsd: "0.00",
        createdAtMs: 2000,
      },
      {
        activityId: "activity-dev-1",
        campaignId: "cmp-1",
        developerId: "dev-1",
        advertiserId: "adv-1",
        type: "impression_attempt",
        status: "credited",
        viewDurationMs: 3000,
        revenueMicrocents: 30000,
        developerCreditCents: 2,
        developerCreditUsd: "0.02",
        createdAtMs: 1000,
      },
    ]);
  });

  it("returns newest-first bounded pages with a cursor", async () => {
    const container = getContainer();
    const activities = container.activities as MemoryActivityRepository;
    for (const index of [1, 2, 3]) {
      await activities.record({
        activityId: `activity-page-${index}`,
        campaignId: `cmp-${index}`,
        developerId: "dev-1",
        advertiserId: "adv-1",
        status: index === 1 ? "tooShort" : "credited",
        viewDurationMs: index * 1000,
        revenueMicrocents: 0,
        developerCreditCents: 0,
        createdAtMs: index * 1000,
      });
    }
    const token = (container.auth as MockAuthProvider).mintToken("dev-1");

    const firstResponse = await GET(activityRequest(token, "?limit=2"));
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.activities.map((row: { activityId: string }) => row.activityId)).toEqual([
      "activity-page-3",
      "activity-page-2",
    ]);
    expect(firstBody.nextCursor).toBe("2000:activity-page-2");

    const secondResponse = await GET(
      activityRequest(token, `?limit=2&cursor=${encodeURIComponent(firstBody.nextCursor)}`),
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.activities.map((row: { activityId: string }) => row.activityId)).toEqual([
      "activity-page-1",
    ]);
    expect(secondBody.nextCursor).toBeUndefined();
  });
});
