/**
 * Vitest configuration for `@spinshare/web` (unit + property tests).
 *
 * Mirrors the `@/*` → `src/*` path alias from `tsconfig.json` so tests can load
 * App Router route modules (which import server code via `@/server/...`) the
 * same way Next.js does. `@spinshare/core` resolves through the normal
 * workspace node resolution.
 *
 * The end-to-end suite under `test/e2e/**` is intentionally excluded here: it
 * spins up a real Next.js server and is run separately via the `test:e2e`
 * script (`vitest.e2e.config.ts`). Excluding it keeps the fast unit/property
 * run from booting a server and prevents double-running the e2e tests.
 */

import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "test/e2e/**"],
  },
});
