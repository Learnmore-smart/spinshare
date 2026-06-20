import * as fsp from "node:fs/promises";
import * as path from "node:path";

/**
 * Self-update for the sideloaded SpinShare extension.
 *
 * SpinShare is installed from a `.vsix` (one-line `curl … | code
 * --install-extension`), not from the Marketplace, so the editor's built-in
 * extension auto-update never applies. This module gives the extension its own
 * updater: it polls `GET /api/extension/version` on the configured base URL,
 * compares the advertised version against the running one, and — when a newer
 * version is published — downloads the VSIX and installs it in place via the
 * stable `workbench.extensions.installExtension` command, then offers a reload.
 *
 * Everything the updater touches (network, filesystem, the VSCode namespace) is
 * injected so the logic is unit-testable with no real editor, disk, or network.
 * The host (`extension.ts`) wires the real `fetch`, `node:fs/promises`, and the
 * `vscode` module and schedules periodic checks.
 */

/** Minimal `Response` shape the updater reads. */
export interface UpdaterFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Injectable `fetch`-compatible function (defaults to global `fetch`). */
export type UpdaterFetch = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<UpdaterFetchResponse>;

/** The slice of `node:fs/promises` the updater needs. */
export interface UpdaterFs {
  mkdir(dir: string, options: { recursive: true }): Promise<unknown>;
  writeFile(file: string, data: Uint8Array): Promise<void>;
}

/** The slice of the VSCode namespace the updater needs. */
export interface UpdaterVscodeLike {
  window: {
    showInformationMessage(
      message: string,
      ...items: string[]
    ): Thenable<string | undefined>;
    showErrorMessage(
      message: string,
      ...items: string[]
    ): Thenable<string | undefined>;
  };
  commands: {
    executeCommand(command: string, ...rest: unknown[]): Thenable<unknown>;
  };
  Uri: { file(fsPath: string): unknown };
}

/** Parsed `GET /api/extension/version` payload. */
export interface ExtensionReleaseInfo {
  /** Semantic version of the published VSIX. */
  version: string;
  /** Absolute URL the VSIX can be downloaded from. */
  url: string;
}

export interface ExtensionUpdaterOptions {
  /** Version of the currently running extension (`context.extension.packageJSON.version`). */
  currentVersion: string;
  /** Base URL of the SpinShare web app the extension is pointed at. */
  baseUrl: string;
  /** Directory to stage downloaded VSIX files in (e.g. global storage). */
  downloadDir: string;
  vscode: UpdaterVscodeLike;
  /** Defaults to the global `fetch`. */
  fetchImpl?: UpdaterFetch;
  /** Defaults to `node:fs/promises`. */
  fs?: UpdaterFs;
  /** Open a URL in the system browser (download fallback). */
  openUrl?: (url: string) => void;
  onError?: (error: unknown) => void;
}

const VERSION_ENDPOINT = "/api/extension/version";
const INSTALL_COMMAND = "workbench.extensions.installExtension";
const RELOAD_COMMAND = "workbench.action.reloadWindow";

/** Split a version into numeric release segments, ignoring any prerelease/build suffix. */
function releaseSegments(version: string): number[] {
  const core = version.trim().replace(/^v/i, "").split(/[-+]/, 1)[0] ?? "";
  return core.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * Compare two semantic versions by their `major.minor.patch` release segments.
 * Returns a negative number when `a < b`, `0` when equal, positive when `a > b`.
 * Prerelease and build metadata are ignored so `1.2.3-rc.1` ties `1.2.3`.
 */
export function compareSemver(a: string, b: string): number {
  const left = releaseSegments(a);
  const right = releaseSegments(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) {
      return diff < 0 ? -1 : 1;
    }
  }
  return 0;
}

/** True when `latest` is a strictly newer release than `current`. */
export function isUpdateAvailable(current: string, latest: string): boolean {
  return compareSemver(latest, current) > 0;
}

/** Narrow an unknown JSON value into {@link ExtensionReleaseInfo}, or `null`. */
export function parseReleaseInfo(value: unknown): ExtensionReleaseInfo | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.version === "string" &&
    obj.version.length > 0 &&
    typeof obj.url === "string" &&
    /^https?:\/\//i.test(obj.url)
  ) {
    return { version: obj.version, url: obj.url };
  }
  return null;
}

function resolveDefaultFetch(): UpdaterFetch {
  const globalFetch = (globalThis as { fetch?: unknown }).fetch;
  if (typeof globalFetch !== "function") {
    throw new Error("No global fetch available; pass a fetchImpl to ExtensionUpdater.");
  }
  return globalFetch as UpdaterFetch;
}

/**
 * Polls for, downloads, and installs newer SpinShare VSIX releases.
 *
 * Stateless apart from its injected configuration; safe to construct once per
 * session. Network, filesystem, and editor failures are surfaced through
 * `onError` and a graceful user-facing fallback rather than thrown, so a
 * transient outage never breaks activation.
 */
export class ExtensionUpdater {
  private readonly currentVersion: string;
  private readonly baseUrl: string;
  private readonly downloadDir: string;
  private readonly vscode: UpdaterVscodeLike;
  private readonly fetchImpl: UpdaterFetch;
  private readonly fs: UpdaterFs;
  private readonly openUrl: (url: string) => void;
  private readonly onError: (error: unknown) => void;
  private running = false;

  constructor(options: ExtensionUpdaterOptions) {
    this.currentVersion = options.currentVersion;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.downloadDir = options.downloadDir;
    this.vscode = options.vscode;
    this.fetchImpl = options.fetchImpl ?? resolveDefaultFetch();
    this.fs = options.fs ?? fsp;
    this.openUrl = options.openUrl ?? (() => {});
    this.onError = options.onError ?? (() => {});
  }

  /**
   * Fetch the latest-release manifest and return it only when it describes a
   * version newer than the running one. Resolves to `null` on any network
   * error, non-OK status, malformed payload, or when already up to date.
   */
  async checkForUpdate(): Promise<ExtensionReleaseInfo | null> {
    let res: UpdaterFetchResponse;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${VERSION_ENDPOINT}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      this.onError(error);
      return null;
    }
    if (!res.ok) {
      return null;
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (error) {
      this.onError(error);
      return null;
    }

    const release = parseReleaseInfo(body);
    if (release === null) {
      return null;
    }
    if (!isUpdateAvailable(this.currentVersion, release.version)) {
      return null;
    }
    return release;
  }

  /**
   * Run a full check-and-update cycle.
   *
   * When `manual` is true (the user invoked the command), an "already up to
   * date" / failure result is surfaced as a message; otherwise the cycle stays
   * silent until there is something to install. Concurrent runs are coalesced.
   */
  async run(options: { manual?: boolean } = {}): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const release = await this.checkForUpdate();
      if (release === null) {
        if (options.manual) {
          void this.vscode.window.showInformationMessage(
            `SpinShare is up to date (v${this.currentVersion}).`,
          );
        }
        return;
      }
      await this.installRelease(release);
    } finally {
      this.running = false;
    }
  }

  private async installRelease(release: ExtensionReleaseInfo): Promise<void> {
    let vsixPath: string;
    try {
      vsixPath = await this.downloadVsix(release);
      await this.vscode.commands.executeCommand(
        INSTALL_COMMAND,
        this.vscode.Uri.file(vsixPath),
      );
    } catch (error) {
      this.onError(error);
      const choice = await this.vscode.window.showErrorMessage(
        `SpinShare ${release.version} is available, but the in-place update failed. Download it manually?`,
        "Download",
      );
      if (choice === "Download") {
        this.openUrl(release.url);
      }
      return;
    }

    const choice = await this.vscode.window.showInformationMessage(
      `SpinShare updated to v${release.version}. Reload the window to finish.`,
      "Reload Now",
      "Later",
    );
    if (choice === "Reload Now") {
      void this.vscode.commands.executeCommand(RELOAD_COMMAND);
    }
  }

  private async downloadVsix(release: ExtensionReleaseInfo): Promise<string> {
    const res = await this.fetchImpl(release.url, {
      method: "GET",
      headers: { Accept: "application/octet-stream" },
    });
    if (!res.ok) {
      throw new Error(`VSIX download failed with status ${res.status}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    await this.fs.mkdir(this.downloadDir, { recursive: true });
    const vsixPath = path.join(
      this.downloadDir,
      `spinshare-${release.version}.vsix`,
    );
    await this.fs.writeFile(vsixPath, bytes);
    return vsixPath;
  }
}
