import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface PackageJson {
  private?: boolean;
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(): PackageJson {
  return JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as PackageJson;
}

describe("package manifest", () => {
  it("is publishable to npm", () => {
    const pkg = readPackageJson();

    expect(pkg.private).not.toBe(true);
    expect(pkg.bin?.spinshare).toBe("dist/index.js");
  });

  it("does not publish workspace protocol runtime dependencies", () => {
    const pkg = readPackageJson();

    expect(
      Object.entries(pkg.dependencies ?? {}).filter(([, version]) =>
        version.startsWith("workspace:"),
      ),
    ).toEqual([]);
    expect(pkg.dependencies?.["@spinshare/core"]).toBeUndefined();
    expect(pkg.devDependencies?.["@spinshare/core"]).toBe("workspace:*");
  });
});
