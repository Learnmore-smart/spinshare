import { defineConfig } from "vitest/config";

/**
 * Scope Vitest to the TypeScript sources under `src/` only.
 *
 * The extension builds with `tsc` into `out/`; without this scope Vitest would
 * also discover any compiled `*.test.js` there and try to run them as CommonJS,
 * which fails. Restricting the include (and excluding build output) keeps the
 * test run deterministic against the source files.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
    exclude: ["node_modules", "out", "dist", "coverage"],
  },
});
