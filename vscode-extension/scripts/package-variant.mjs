#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import AdmZip from "adm-zip";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(extensionRoot, "package.json");

const FLAVORS = {
  prod: {
    displayName: "SpinShare",
    baseUrl: "https://www.spinshare.dev",
    description:
      "SpinShare extension: wraps terminal AI agents and shows ads during AI generation wait states. Compatible with VSCode, Trae, and Cursor.",
  },
  local: {
    displayName: "SpinShare Local",
    baseUrl: "http://localhost:3000",
    description:
      "SpinShare local extension: connects to localhost for sample ads and development testing.",
  },
};

export function applyFlavorToManifest(manifest, flavor) {
  const config = FLAVORS[flavor];
  if (!config) {
    throw new Error(`Unknown extension package flavor "${flavor}". Use prod or local.`);
  }

  const next = structuredClone(manifest);
  const baseUrlSetting =
    next.contributes?.configuration?.properties?.["spinshare.baseUrl"];
  if (!baseUrlSetting) {
    throw new Error('Missing contributes.configuration.properties["spinshare.baseUrl"].');
  }

  next.displayName = config.displayName;
  next.description = config.description;
  baseUrlSetting.default = config.baseUrl;
  return next;
}

export function vsixOutputName(manifest, flavor) {
  if (!FLAVORS[flavor]) {
    throw new Error(`Unknown extension package flavor "${flavor}". Use prod or local.`);
  }
  return `spinshare-${flavor}-${manifest.version}.vsix`;
}

function corepackCommand(platform = process.platform) {
  return platform === "win32" ? "corepack.cmd" : "corepack";
}

export function spawnOptionsForPlatform(platform = process.platform) {
  return {
    stdio: "inherit",
    shell: platform === "win32",
  };
}

function run(command, args, cwd, platform = process.platform) {
  const result = spawnSync(command, args, {
    cwd,
    ...spawnOptionsForPlatform(platform),
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

function fixVsixReadmeCasing(vsixPath) {
  const zip = new AdmZip(vsixPath);
  const renames = [
    { from: /^extension\/readme\.md$/i, to: "extension/README.md" },
    { from: /^extension\/readme\.zh-cn\.md$/i, to: "extension/README.zh-cn.md" },
    { from: /^extension\/readme\.fr-fr\.md$/i, to: "extension/README.fr-fr.md" },
  ];

  for (const entry of [...zip.getEntries()]) {
    for (const { from, to } of renames) {
      if (from.test(entry.entryName) && entry.entryName !== to) {
        zip.addFile(to, entry.getData());
        zip.deleteFile(entry);
      }
    }
  }

  zip.writeZip(vsixPath);
}

export async function packageVariant(flavor, options = {}) {
  const root = options.extensionRoot ?? extensionRoot;
  const manifestPath = options.packageJsonPath ?? packageJsonPath;
  const originalText = await readFile(manifestPath, "utf8");
  const originalManifest = JSON.parse(originalText);
  const variantManifest = applyFlavorToManifest(originalManifest, flavor);
  const outputName = vsixOutputName(originalManifest, flavor);
  const outputPath = join(root, outputName);

  await writeFile(manifestPath, `${JSON.stringify(variantManifest, null, 2)}\n`);
  try {
    run(
      corepackCommand(options.platform),
      [
        "pnpm@9.12.0",
        "exec",
        "vsce",
        "package",
        "--allow-missing-repository",
        "--out",
        outputName,
      ],
      root,
      options.platform,
    );
    fixVsixReadmeCasing(outputPath);
  } finally {
    await writeFile(manifestPath, originalText);
  }

  return outputPath;
}

async function main() {
  const flavor = process.argv[2] ?? "prod";
  const outputPath = await packageVariant(flavor);
  console.log(`Packaged ${flavor} extension: ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
