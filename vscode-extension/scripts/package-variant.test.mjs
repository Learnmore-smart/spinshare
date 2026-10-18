import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyFlavorToManifest,
  spawnOptionsForPlatform,
  vsixOutputName,
} from "./package-variant.mjs";

const baseManifest = {
  name: "spinshare",
  displayName: "SpinShare",
  version: "0.2.0",
  contributes: {
    configuration: {
      properties: {
        "spinshare.baseUrl": {
          type: "string",
          default: "https://spinshare-web-vert.vercel.app",
        },
        "spinshare.autoUpdate": {
          type: "boolean",
          default: true,
        },
      },
    },
  },
};

const autoUpdateDefault = (manifest) =>
  manifest.contributes.configuration.properties["spinshare.autoUpdate"].default;

describe("package variant helpers", () => {
  it("builds a localhost extension manifest variant", () => {
    const manifest = applyFlavorToManifest(baseManifest, "local");

    expect(manifest.name).toBe("spinshare");
    expect(manifest.displayName).toBe("SpinShare Local");
    expect(
      manifest.contributes.configuration.properties["spinshare.baseUrl"]
        .default,
    ).toBe("http://localhost:3000");
    // A localhost dev build must not reinstall itself from localhost.
    expect(autoUpdateDefault(manifest)).toBe(false);
  });

  it("builds a production extension manifest variant", () => {
    const manifest = applyFlavorToManifest(baseManifest, "prod");

    expect(manifest.displayName).toBe("SpinShare");
    expect(
      manifest.contributes.configuration.properties["spinshare.baseUrl"]
        .default,
    ).toBe("https://spinshare-web-vert.vercel.app");
    expect(autoUpdateDefault(manifest)).toBe(true);
  });

  it("uses deterministic output filenames", () => {
    expect(vsixOutputName(baseManifest, "prod")).toBe(
      "spinshare-prod-0.2.0.vsix",
    );
    expect(vsixOutputName(baseManifest, "local")).toBe(
      "spinshare-local-0.2.0.vsix",
    );
  });

  it("uses shell spawning for Windows command wrappers", () => {
    expect(spawnOptionsForPlatform("win32")).toMatchObject({
      shell: true,
    });
    expect(spawnOptionsForPlatform("linux")).toMatchObject({
      shell: false,
    });
  });

  it("packages once, verifies the untouched artifact, and restores the manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "spinshare-package-variant-"));
    const manifestPath = join(root, "package.json");
    const originalText = `${JSON.stringify(baseManifest, null, 2)}\n`;
    const events = [];

    await writeFile(manifestPath, originalText);
    try {
      const outputPath = await import("./package-variant.mjs").then(
        ({ packageVariant }) =>
          packageVariant("prod", {
            extensionRoot: root,
            packageJsonPath: manifestPath,
            platform: "linux",
            runCommand(command, args, cwd) {
              events.push({ type: "package", command, args, cwd });
            },
            verifyArtifact(path) {
              events.push({ type: "verify", path });
            },
          }),
      );

      expect(events).toEqual([
        expect.objectContaining({
          type: "package",
          command: "corepack",
          cwd: root,
        }),
        { type: "verify", path: outputPath },
      ]);
      expect(await readFile(manifestPath, "utf8")).toBe(originalText);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
