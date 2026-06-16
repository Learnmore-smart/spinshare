import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildContainer } from "./container";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "SPINSHARE_FIRESTORE_NAMESPACE",
  "SPINSHARE_USE_FIRESTORE",
  "SPINSHARE_SEED_LOCAL_DATA",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;
let savedNodeEnv: string | undefined;

function localEnv(extra: Record<string, string | undefined> = {}) {
  return {
    SPINSHARE_MODE: "local",
    SPINSHARE_COUNTER: "memory",
    STRIPE_MODE: "mock",
    AUTH_MODE: "mock",
    ...extra,
  };
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  savedNodeEnv = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  if (savedNodeEnv === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
  }
});

describe("buildContainer local seed data", () => {
  it("does not seed the funded LearnX campaign by default in local development", async () => {
    const container = buildContainer(localEnv());

    await expect(container.campaigns.listBiddable()).resolves.toEqual([]);
  });

  it("seeds local demo data only when explicitly requested", async () => {
    const container = buildContainer(
      localEnv({ SPINSHARE_SEED_LOCAL_DATA: "1" }),
    );

    await expect(container.campaigns.listBiddable()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cmp-local-demo",
          brandName: "LearnX",
        }),
      ]),
    );
  });
});

describe("buildContainer local Firestore isolation", () => {
  it("requires a namespace when local mode opts into cloud Firestore", () => {
    expect(() =>
      buildContainer(localEnv({ SPINSHARE_USE_FIRESTORE: "1" })),
    ).toThrow(/SPINSHARE_FIRESTORE_NAMESPACE/);
  });

  it("allows local Firestore emulator usage without a namespace", () => {
    expect(() =>
      buildContainer(
        localEnv({
          FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
          SPINSHARE_USE_FIRESTORE: "1",
        }),
      ),
    ).not.toThrow();
  });
});
