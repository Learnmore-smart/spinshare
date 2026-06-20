import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const REQUIRED_ENTRIES = [
  "[Content_Types].xml",
  "extension.vsixmanifest",
  "extension/package.json",
];

const PROHIBITED_PAYLOADS = [
  /\.pdb$/i,
  /\/(?:deps|src)\//i,
  /\/(?:Makefile|binding\.gyp)$/i,
  /\.(?:c|cc|cpp|h|gypi|mk|py|sh|ps1|bat)$/i,
];

function readmeAssetPath(manifestXml) {
  const assetTags = manifestXml.match(/<Asset\b[^>]*>/gi) ?? [];
  const detailsAsset = assetTags.find((tag) =>
    /\bType\s*=\s*["']Microsoft\.VisualStudio\.Services\.Content\.Details["']/i.test(
      tag,
    ),
  );
  const pathMatch = detailsAsset?.match(/\bPath\s*=\s*["']([^"']+)["']/i);
  if (!pathMatch) {
    throw new Error("VSIX manifest is missing its primary README asset path");
  }
  return pathMatch[1];
}

export function validateVsixContents({ entryNames, manifestXml }) {
  const entries = new Set(entryNames);

  for (const requiredEntry of REQUIRED_ENTRIES) {
    if (!entries.has(requiredEntry)) {
      throw new Error(`Required VSIX entry "${requiredEntry}" is missing`);
    }
  }

  const readmePath = readmeAssetPath(manifestXml);
  if (!entries.has(readmePath)) {
    throw new Error(`README asset "${readmePath}" is missing from the VSIX`);
  }

  for (const entryName of entries) {
    if (PROHIBITED_PAYLOADS.some((pattern) => pattern.test(entryName))) {
      throw new Error(`Prohibited VSIX payload "${entryName}"`);
    }
  }

  return { entryCount: entries.size, readmePath };
}

export function verifyVsixFile(vsixPath) {
  // Read-only use: never add, delete, rename, or write archive entries here.
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(vsixPath);
  const entries = zip.getEntries();
  const manifestEntry = entries.find(
    (entry) => entry.entryName === "extension.vsixmanifest",
  );
  const manifestXml = manifestEntry?.getData().toString("utf8") ?? "";

  return validateVsixContents({
    entryNames: entries.map((entry) => entry.entryName),
    manifestXml,
  });
}
