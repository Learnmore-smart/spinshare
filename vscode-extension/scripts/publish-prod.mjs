#!/usr/bin/env node
/**
 * Publish the production VSIX so the self-updater can serve it.
 *
 * The SpinShare extension is sideloaded, so it updates itself by polling
 * `GET /api/extension/version` and reinstalling the VSIX from `/vsix`. Three
 * things must therefore stay in lockstep, and this script updates all three in
 * one pass so they can never drift:
 *
 *   1. Build the production VSIX (`packageVariant("prod")`).
 *   2. Copy it to `web/public/spinshare.vsix` — the artifact `/vsix` serves.
 *   3. Rewrite `LATEST_EXTENSION_VERSION` in `web/src/lib/extension-release.ts`
 *      — the version `/api/extension/version` advertises.
 *
 * Run after bumping `version` in `vscode-extension/package.json`:
 *
 *   corepack pnpm@9.12.0 --filter ./vscode-extension publish:prod
 */
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { packageVariant, vsixOutputName } from "./package-variant.mjs";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(extensionRoot, "..");
const publicVsixPath = join(repoRoot, "web", "public", "spinshare.vsix");
const releaseFilePath = join(
  repoRoot,
  "web",
  "src",
  "lib",
  "extension-release.ts",
);

async function rewriteReleaseVersion(version) {
  const original = await readFile(releaseFilePath, "utf8");
  const pattern = /(LATEST_EXTENSION_VERSION = ")[^"]*(")/;
  if (!pattern.test(original)) {
    throw new Error(
      `Could not find LATEST_EXTENSION_VERSION in ${releaseFilePath}.`,
    );
  }
  const next = original.replace(pattern, `$1${version}$2`);
  if (next !== original) {
    await writeFile(releaseFilePath, next);
  }
}

export async function publishProd(options = {}) {
  const manifestPath = join(extensionRoot, "package.json");
  const { version } = JSON.parse(await readFile(manifestPath, "utf8"));

  const vsixPath =
    options.vsixPath ?? (await packageVariant("prod"));
  await copyFile(vsixPath, publicVsixPath);
  await rewriteReleaseVersion(version);

  return { version, vsixPath, publicVsixPath, releaseFilePath };
}

async function main() {
  const result = await publishProd();
  console.log(
    `Published SpinShare v${result.version}:\n` +
      `  VSIX  -> ${result.publicVsixPath}\n` +
      `  Version manifest updated -> ${result.releaseFilePath}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
