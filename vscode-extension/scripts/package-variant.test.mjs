import { describe, expect, it } from "vitest";

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
          default: "https://www.spinshare.dev",
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
    ).toBe("https://www.spinshare.dev");
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
});
