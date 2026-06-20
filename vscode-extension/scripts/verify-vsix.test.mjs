import { describe, expect, it } from "vitest";

import { validateVsixContents } from "./verify-vsix.mjs";

const requiredEntries = [
  "[Content_Types].xml",
  "extension.vsixmanifest",
  "extension/package.json",
];

const ptyRoot =
  "extension/cli-wrapper/node_modules/@homebridge/node-pty-prebuilt-multiarch";
const runtimeEntries = [
  `${ptyRoot}/package.json`,
  `${ptyRoot}/lib/index.js`,
  `${ptyRoot}/build/Release/pty.node`,
];
const validEntries = [...requiredEntries, ...runtimeEntries, "extension/readme.md"];

const manifestWithReadme = (path) => `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="${path}" />
  </Assets>
</PackageManifest>`;

describe("VSIX structure validation", () => {
  it("accepts an exact README asset entry", () => {
    const result = validateVsixContents({
      entryNames: validEntries,
      manifestXml: manifestWithReadme("extension/readme.md"),
    });

    expect(result.readmePath).toBe("extension/readme.md");
  });

  it("rejects the historical README casing mismatch", () => {
    expect(() =>
      validateVsixContents({
        entryNames: [...requiredEntries, ...runtimeEntries, "extension/README.md"],
        manifestXml: manifestWithReadme("extension/readme.md"),
      }),
    ).toThrow('README asset "extension/readme.md" is missing');
  });

  it("rejects a missing required OPC entry", () => {
    expect(() =>
      validateVsixContents({
        entryNames: [
          "extension.vsixmanifest",
          ...runtimeEntries,
          "extension/readme.md",
        ],
        manifestXml: manifestWithReadme("extension/readme.md"),
      }),
    ).toThrow('Required VSIX entry "[Content_Types].xml" is missing');
  });

  it("rejects an incomplete PTY runtime", () => {
    for (const missingEntry of runtimeEntries.slice(0, 2)) {
      expect(() =>
        validateVsixContents({
          entryNames: validEntries.filter((entry) => entry !== missingEntry),
          manifestXml: manifestWithReadme("extension/readme.md"),
        }),
      ).toThrow(`Required PTY runtime entry "${missingEntry}" is missing`);
    }

    expect(() =>
      validateVsixContents({
        entryNames: validEntries.filter((entry) => !entry.endsWith(".node")),
        manifestXml: manifestWithReadme("extension/readme.md"),
      }),
    ).toThrow("VSIX does not contain a PTY native .node runtime");
  });

  it("rejects native debug and source payloads", () => {
    for (const prohibitedEntry of [
      "extension/cli-wrapper/node_modules/pty/build/Release/pty.pdb",
      "extension/cli-wrapper/node_modules/pty/deps/winpty/src/Agent.cc",
    ]) {
      expect(() =>
        validateVsixContents({
          entryNames: [
            ...validEntries,
            prohibitedEntry,
          ],
          manifestXml: manifestWithReadme("extension/readme.md"),
        }),
      ).toThrow(`Prohibited VSIX payload "${prohibitedEntry}"`);
    }
  });
});
