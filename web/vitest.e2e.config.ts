/**
 * Vitest configuration for the `@spinshare/web` end-to-end suite.
 *
 * Runs only `test/e2e/**`, which boots a real Next.js server via the harness
 * (`test/e2e/harness.ts`) in `SPINSHARE_MODE=local`. Because the harness allows
 * up to a 60-second startup poll (Requirements 11.1, 11.8) and then exercises
 * the money path, the suite uses generous test/hook timeouts and runs serially
 * (a single fork) so concurrent suites never contend for the server or ports.
 */

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["test/e2e/**/*.{test,e2e.test}.ts"],
    // The 60s startup poll plus settlement work needs headroom beyond defaults.
    testTimeout: 90_000,
    hookTimeout: 90_000,
    // Boot/own a single server process at a time — no parallel suites.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
