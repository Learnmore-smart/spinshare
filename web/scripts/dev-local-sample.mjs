#!/usr/bin/env node
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export function buildLocalSampleEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    SPINSHARE_MODE: "local",
    SPINSHARE_COUNTER: "memory",
    AUTH_MODE: "mock",
    STRIPE_MODE: "mock",
    SPINSHARE_SEED_LOCAL_DATA: "1",
    SPINSHARE_USE_FIRESTORE: "0",
    FIRESTORE_EMULATOR_HOST: "",
    NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS: "1",
    NEXTAUTH_URL: "http://localhost:3000",
    AUTH_VERIFICATION_URI: "http://localhost:3000/activate",
  };
}

export function devLocalSampleCommand(platform = process.platform) {
  return {
    command: platform === "win32" ? "corepack.cmd" : "corepack",
    args: ["pnpm@9.12.0", "--filter", "@spinshare/web", "dev"],
  };
}

export function devLocalSampleSpawnOptions(platform = process.platform) {
  return {
    shell: platform === "win32",
  };
}

export function runLocalSampleDev() {
  const { command, args } = devLocalSampleCommand();
  const child = spawn(command, args, {
    stdio: "inherit",
    env: buildLocalSampleEnv(),
    ...devLocalSampleSpawnOptions(),
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalSampleDev();
}
