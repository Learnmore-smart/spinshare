import { describe, expect, it } from "vitest";

import { validateVsixContents } from "./verify-vsix.mjs";

const requiredEntries = [
  "[Content_Types].xml",
  "extension.vsixmanifest",
  "extension/package.json",
];

const manifestWithReadme = (path) => `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="${path}" />
  </Assets>
</PackageManifest>`;

describe("VSIX structure validation", () => {
  it("accepts an exact README asset entry", () => {
    const result = validateVsixContents({
      entryNames: [...requiredEntries, "extension/readme.md"],
      manifestXml: manifestWithReadme("extension/readme.md"),
    });

    expect(result.readmePath).toBe("extension/readme.md");
  });

  it("rejects the historical README casing mismatch", () => {
    expect(() =>
      validateVsixContents({
        entryNames: [...requiredEntries, "extension/README.md"],
        manifestXml: manifestWithReadme("extension/readme.md"),
      }),
    ).toThrow('README asset "extension/readme.md" is missing');
  });

  it("rejects a missing required OPC entry", () => {
    expect(() =>
      validateVsixContents({
        entryNames: ["extension.vsixmanifest", "extension/readme.md"],
        manifestXml: manifestWithReadme("extension/readme.md"),
      }),
    ).toThrow('Required VSIX entry "[Content_Types].xml" is missing');
  });

  it("rejects native debug and source payloads", () => {
    for (const prohibitedEntry of [
      "extension/cli-wrapper/node_modules/pty/build/Release/pty.pdb",
      "extension/cli-wrapper/node_modules/pty/deps/winpty/src/Agent.cc",
    ]) {
      expect(() =>
        validateVsixContents({
          entryNames: [
            ...requiredEntries,
            "extension/readme.md",
            prohibitedEntry,
          ],
          manifestXml: manifestWithReadme("extension/readme.md"),
        }),
      ).toThrow(`Prohibited VSIX payload "${prohibitedEntry}"`);
    }
  });
});
