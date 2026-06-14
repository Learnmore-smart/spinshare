/**
 * Fix README entry casing inside a .vsix on Windows.
 * VS Code/Cursor require `extension/README.md` (uppercase); vsce on Windows
 * often archives it as `readme.md`, which shows "No README available".
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const vsixFiles = readdirSync(root)
  .filter((f) => f.endsWith(".vsix"))
  .sort();
const vsixName = vsixFiles.at(-1);
if (!vsixName) {
  console.error("No .vsix found in vscode-extension/");
  process.exit(1);
}

const vsixPath = join(root, vsixName);
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
      console.log(`Renamed ${entry.entryName} → ${to}`);
    }
  }
}

zip.writeZip(vsixPath);
console.log(`Fixed README casing in ${vsixName}`);
