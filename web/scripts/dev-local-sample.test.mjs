import { describe, expect, it } from "vitest";

import {
  buildLocalSampleEnv,
  devLocalSampleCommand,
  devLocalSampleSpawnOptions,
} from "./dev-local-sample.mjs";

describe("dev local sample launcher", () => {
  it("builds an env with local mock providers and sample seed data", () => {
    const env = buildLocalSampleEnv({
      EXISTING: "kept",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      SPINSHARE_USE_FIRESTORE: "1",
    });

    expect(env).toMatchObject({
      EXISTING: "kept",
      SPINSHARE_MODE: "local",
      AUTH_MODE: "mock",
      STRIPE_MODE: "mock",
      SPINSHARE_COUNTER: "memory",
      SPINSHARE_USE_FIRESTORE: "0",
      FIRESTORE_EMULATOR_HOST: "",
      SPINSHARE_SEED_LOCAL_DATA: "1",
      NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS: "1",
      NEXTAUTH_URL: "http://localhost:3000",
      AUTH_VERIFICATION_URI: "http://localhost:3000/activate",
    });
  });

  it("starts the web dev server through corepack", () => {
    expect(devLocalSampleCommand("win32")).toEqual({
      command: "corepack.cmd",
      args: ["pnpm@9.12.0", "--filter", "@spinshare/web", "dev"],
    });
    expect(devLocalSampleCommand("linux")).toEqual({
      command: "corepack",
      args: ["pnpm@9.12.0", "--filter", "@spinshare/web", "dev"],
    });
  });

  it("uses shell spawning on Windows so corepack.cmd can launch", () => {
    expect(devLocalSampleSpawnOptions("win32")).toMatchObject({
      shell: true,
    });
    expect(devLocalSampleSpawnOptions("linux")).toMatchObject({
      shell: false,
    });
  });
});
