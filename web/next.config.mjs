import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// forceReload: Next.js caches the first loadEnvConfig(web/) call; reload from monorepo root.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", console, true);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
