import { defineConfig } from "tsup";

// Emits ESM (.js) + type declarations (.d.ts). The package is ESM-only: its
// consumers are the Next.js web app (bundled via `transpilePackages`), the Node
// ESM CLI, and the VSCode extension (which imports types only, resolved through
// the `.d.ts`). A dual CJS build was dropped because tsup's CJS output defines
// its exports dynamically via getters, which webpack cannot statically analyze
// — that produced "Attempted import error: 'X' is not exported from
// '@spinshare/core'" warnings and runtime 500s in the Next.js API routes. The
// ESM build ends in a static `export { ... }`, so every named import resolves.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
});
