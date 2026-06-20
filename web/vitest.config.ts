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
 *
 * The `scripts/` folder is also excluded: its `.test.mjs` files are standalone
 * smoke / dev-seed scripts that hit a live local server (run via the `smoke:*`
 * npm scripts), NOT unit tests. Vitest's default include glob matches any
 * `.test.mjs` anywhere, so it was sweeping them into the fast suite where they
 * fail to parse under esbuild — normalising a permanently-red suite. Keeping
 * them out makes a green run mean "everything passes", which is the
 * precondition for a trustworthy CI gate.
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
    exclude: [...configDefaults.exclude, "test/e2e/**", "scripts/**"],
  },
});
