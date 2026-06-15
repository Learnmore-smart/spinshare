import { defineConfig } from "tsup";

// The CLI is a Node ESM binary. tsup preserves the `#!/usr/bin/env node` shebang
// from the entry file and marks the output executable so `spinshare` runs directly.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "node20",
  platform: "node",
  // Native dependencies are loaded lazily at runtime; never bundle them because
  // the installed extension must ship their native files next to the CLI.
  external: ["keytar", "@homebridge/node-pty-prebuilt-multiarch"],
});
