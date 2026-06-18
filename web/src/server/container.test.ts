import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildContainer, resolveRtdbRootPath } from "./container";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "SPINSHARE_FIRESTORE_NAMESPACE",
  "SPINSHARE_USE_FIRESTORE",
  "SPINSHARE_SEED_LOCAL_DATA",
  "STRIPE_MODE",
  "AUTH_MODE",
  "SPINSHARE_RTDB_ROOT_PATH",
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
  it("does not seed the funded sample campaign by default in local development", async () => {
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
          brandName: "SpinShare Local",
          destinationUrl: "https://www.spinshare.dev",
        }),
      ]),
    );
    const seeded = await container.campaigns.listBiddable();
    expect(
      seeded.some(
        (campaign) =>
          campaign.brandName?.includes("LearnX") ||
          campaign.adText.includes("LearnX"),
      ),
    ).toBe(false);
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

describe("buildContainer local real Stripe durability", () => {
  it("rejects real Stripe checkout when local durable storage is still memory", () => {
    expect(() =>
      buildContainer(localEnv({ STRIPE_MODE: "test" })),
    ).toThrow(/STRIPE_MODE="test"/);
  });

  it("allows real Stripe checkout when local durable storage uses Firestore emulator", () => {
    expect(() =>
      buildContainer(
        localEnv({
          STRIPE_MODE: "test",
          FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        }),
      ),
    ).not.toThrow();
  });

  it("allows real Stripe checkout when local cloud Firestore is namespace-isolated", () => {
    expect(() =>
      buildContainer(
        localEnv({
          STRIPE_MODE: "test",
          SPINSHARE_USE_FIRESTORE: "1",
          SPINSHARE_FIRESTORE_NAMESPACE: "test",
        }),
      ),
    ).not.toThrow();
  });
});

describe("resolveRtdbRootPath", () => {
  it("keeps the default RTDB hot root in production unless explicitly overridden", () => {
    expect(resolveRtdbRootPath({}, "production")).toBeUndefined();
  });

  it("isolates local RTDB hot counters under the Firestore namespace", () => {
    expect(
      resolveRtdbRootPath(
        { SPINSHARE_FIRESTORE_NAMESPACE: "test" },
        "local",
      ),
    ).toBe("spinshare/namespaces/test/hot");
  });

  it("uses a local RTDB namespace when local mode has no Firestore namespace", () => {
    expect(resolveRtdbRootPath({}, "local")).toBe(
      "spinshare/namespaces/local/hot",
    );
  });

  it("allows an explicit RTDB root override for staging and custom deployments", () => {
    expect(
      resolveRtdbRootPath(
        { SPINSHARE_RTDB_ROOT_PATH: "spinshare/staging/hot" },
        "production",
      ),
    ).toBe("spinshare/staging/hot");
  });
});
