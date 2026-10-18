import * as path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ExtensionUpdater,
  type ExtensionUpdaterOptions,
  type UpdaterFetch,
  type UpdaterFetchResponse,
  compareSemver,
  isUpdateAvailable,
  parseReleaseInfo,
} from "./extension-updater";

describe("compareSemver", () => {
  it("orders releases by major.minor.patch", () => {
    expect(compareSemver("0.2.2", "0.2.3")).toBeLessThan(0);
    expect(compareSemver("0.3.0", "0.2.9")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.2", "1.2.0")).toBe(0);
  });

  it("ignores a leading v and prerelease/build suffixes", () => {
    expect(compareSemver("v0.2.3", "0.2.3")).toBe(0);
    expect(compareSemver("0.2.3-rc.1", "0.2.3")).toBe(0);
    expect(compareSemver("0.2.3", "0.2.4-beta")).toBeLessThan(0);
  });
});

describe("isUpdateAvailable", () => {
  it("is true only for a strictly newer latest version", () => {
    expect(isUpdateAvailable("0.2.2", "0.2.3")).toBe(true);
    expect(isUpdateAvailable("0.2.2", "0.2.2")).toBe(false);
    expect(isUpdateAvailable("0.2.2", "0.2.1")).toBe(false);
  });
});

describe("parseReleaseInfo", () => {
  it("accepts a well-formed manifest", () => {
    expect(
      parseReleaseInfo({ version: "0.2.3", url: "https://spinshare-web-vert.vercel.app/vsix" }),
    ).toEqual({ version: "0.2.3", url: "https://spinshare-web-vert.vercel.app/vsix" });
  });

  it("rejects malformed or non-http payloads", () => {
    expect(parseReleaseInfo(null)).toBeNull();
    expect(parseReleaseInfo({ version: "0.2.3" })).toBeNull();
    expect(parseReleaseInfo({ version: "", url: "https://x/vsix" })).toBeNull();
    expect(parseReleaseInfo({ version: "0.2.3", url: "ftp://x/vsix" })).toBeNull();
  });
});

interface Harness {
  updater: ExtensionUpdater;
  fetchImpl: ReturnType<typeof vi.fn>;
  writes: Array<{ file: string; bytes: Uint8Array }>;
  executeCommand: ReturnType<typeof vi.fn>;
  showInformationMessage: ReturnType<typeof vi.fn>;
  showErrorMessage: ReturnType<typeof vi.fn>;
  openUrl: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
}

function jsonResponse(body: unknown, ok = true, status = 200): UpdaterFetchResponse {
  return {
    ok,
    status,
    json: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

function binaryResponse(bytes: Uint8Array, ok = true, status = 200): UpdaterFetchResponse {
  return {
    ok,
    status,
    json: async () => ({}),
    arrayBuffer: async () => bytes.buffer.slice(0),
  };
}

function makeHarness(
  fetchImpl: UpdaterFetch,
  overrides: Partial<ExtensionUpdaterOptions> = {},
): Harness {
  const writes: Array<{ file: string; bytes: Uint8Array }> = [];
  const fetchSpy = vi.fn(fetchImpl);
  const executeCommand = vi.fn(async () => undefined);
  const showInformationMessage = vi.fn(async () => undefined);
  const showErrorMessage = vi.fn(async () => undefined);
  const openUrl = vi.fn();
  const onError = vi.fn();

  const updater = new ExtensionUpdater({
    currentVersion: "0.2.2",
    baseUrl: "https://spinshare-web-vert.vercel.app",
    downloadDir: "/storage/updates",
    fetchImpl: fetchSpy as unknown as UpdaterFetch,
    fs: {
      mkdir: async () => undefined,
      writeFile: async (file: string, bytes: Uint8Array) => {
        writes.push({ file, bytes });
      },
    },
    vscode: {
      window: { showInformationMessage, showErrorMessage },
      commands: { executeCommand },
      Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath }) },
    },
    openUrl,
    onError,
    ...overrides,
  });

  return {
    updater,
    fetchImpl: fetchSpy,
    writes,
    executeCommand,
    showInformationMessage,
    showErrorMessage,
    openUrl,
    onError,
  };
}

describe("ExtensionUpdater.checkForUpdate", () => {
  it("returns the release when the server advertises a newer version", async () => {
    const { updater, fetchImpl } = makeHarness(async () =>
      jsonResponse({ version: "0.2.3", url: "https://spinshare-web-vert.vercel.app/vsix" }),
    );

    await expect(updater.checkForUpdate()).resolves.toEqual({
      version: "0.2.3",
      url: "https://spinshare-web-vert.vercel.app/vsix",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://spinshare-web-vert.vercel.app/api/extension/version",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns null when already on the latest version", async () => {
    const { updater } = makeHarness(async () =>
      jsonResponse({ version: "0.2.2", url: "https://spinshare-web-vert.vercel.app/vsix" }),
    );
    await expect(updater.checkForUpdate()).resolves.toBeNull();
  });

  it("returns null and reports the error on a network failure", async () => {
    const { updater, onError } = makeHarness(async () => {
      throw new Error("offline");
    });
    await expect(updater.checkForUpdate()).resolves.toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("returns null on a non-OK status or malformed payload", async () => {
    const down = makeHarness(async () => jsonResponse({}, false, 503));
    await expect(down.updater.checkForUpdate()).resolves.toBeNull();

    const garbage = makeHarness(async () => jsonResponse({ nope: true }));
    await expect(garbage.updater.checkForUpdate()).resolves.toBeNull();
  });
});

describe("ExtensionUpdater.run", () => {
  it("downloads, installs the VSIX in place, and offers a reload", async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const { updater, writes, executeCommand, showInformationMessage } = makeHarness(
      async (input) =>
        input.endsWith("/api/extension/version")
          ? jsonResponse({ version: "0.3.0", url: "https://spinshare-web-vert.vercel.app/vsix" })
          : binaryResponse(payload),
    );
    // User accepts the reload prompt.
    showInformationMessage.mockResolvedValueOnce("Reload Now");

    await updater.run();

    expect(writes).toHaveLength(1);
    expect(writes[0]?.file).toBe(
      path.join("/storage/updates", "spinshare-0.3.0.vsix"),
    );
    expect(executeCommand).toHaveBeenCalledWith(
      "workbench.extensions.installExtension",
      expect.objectContaining({ scheme: "file" }),
    );
    expect(executeCommand).toHaveBeenCalledWith("workbench.action.reloadWindow");
  });

  it("installs without reloading when the user defers", async () => {
    const { updater, executeCommand, showInformationMessage } = makeHarness(
      async (input) =>
        input.endsWith("/api/extension/version")
          ? jsonResponse({ version: "0.3.0", url: "https://spinshare-web-vert.vercel.app/vsix" })
          : binaryResponse(new Uint8Array([1])),
    );
    showInformationMessage.mockResolvedValueOnce("Later");

    await updater.run();

    expect(executeCommand).toHaveBeenCalledWith(
      "workbench.extensions.installExtension",
      expect.anything(),
    );
    expect(executeCommand).not.toHaveBeenCalledWith("workbench.action.reloadWindow");
  });

  it("falls back to a manual download when in-place install fails", async () => {
    const { updater, executeCommand, showErrorMessage, openUrl, onError } =
      makeHarness(async (input) =>
        input.endsWith("/api/extension/version")
          ? jsonResponse({ version: "0.3.0", url: "https://spinshare-web-vert.vercel.app/vsix" })
          : binaryResponse(new Uint8Array([1])),
      );
    executeCommand.mockRejectedValueOnce(new Error("command not found"));
    showErrorMessage.mockResolvedValueOnce("Download");

    await updater.run();

    expect(onError).toHaveBeenCalledOnce();
    expect(openUrl).toHaveBeenCalledWith("https://spinshare-web-vert.vercel.app/vsix");
  });

  it("tells the user when a manual check finds no update", async () => {
    const { updater, showInformationMessage } = makeHarness(async () =>
      jsonResponse({ version: "0.2.2", url: "https://spinshare-web-vert.vercel.app/vsix" }),
    );

    await updater.run({ manual: true });

    expect(showInformationMessage).toHaveBeenCalledWith(
      "SpinShare is up to date (v0.2.2).",
    );
  });

  it("stays silent on an automatic check with no update", async () => {
    const { updater, showInformationMessage } = makeHarness(async () =>
      jsonResponse({ version: "0.2.2", url: "https://spinshare-web-vert.vercel.app/vsix" }),
    );

    await updater.run();

    expect(showInformationMessage).not.toHaveBeenCalled();
  });
});
