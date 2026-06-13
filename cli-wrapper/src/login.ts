/**
 * @spinshare/cli — `spinshare login` (browser device flow + credential storage).
 *
 * Implements Requirement 4 for the CLI:
 *   1. Start the device-authorization flow (`POST /api/auth/device/start`).      (R4.1)
 *   2. Open the system browser to `verificationUriComplete`; if launch fails,
 *      print the URL and user code for manual entry.                              (R4.1)
 *   3. Poll `POST /api/auth/device/token`, honoring `intervalSec`, backing off on
 *      `slow_down`, and bounding the whole loop by `expiresInSec`.                (R4.2)
 *   4. On approval, store the Device_Auth_Token in the credential store for reuse
 *      on subsequent runs.                                                        (R4.5)
 *   5. On `expired_token`/timeout or `access_denied`, report a failure.           (R4.6)
 *
 * All side effects (browser launch, sleeping, the clock, the API, the store, and
 * the output streams) are injectable so the flow is fully testable without a
 * network, a real browser, or wall-clock delays.
 */

import { spawn } from "node:child_process";
import type { DeviceAuthApi } from "./api-client.js";
import type { CredentialStore } from "./credential-store.js";

/** Opens a URL in the system browser; resolves `true` if a launcher started. */
export type BrowserLauncher = (url: string) => Promise<boolean>;

/** Injectable dependencies for {@link runLogin}; all default to real impls. */
export interface RunLoginDeps {
  /** Device-flow API client (e.g. {@link import("./api-client.js").CliApiClient}). */
  api: DeviceAuthApi;
  /** Where the issued token is persisted for reuse. */
  store: CredentialStore;
  /** Opens the verification URL in the system browser. */
  openBrowser?: BrowserLauncher;
  /** Sleep for `ms` milliseconds (injectable for tests). */
  sleep?: (ms: number) => Promise<void>;
  /** Monotonic-ish clock in ms (injectable for tests). Defaults to `Date.now`. */
  now?: () => number;
  /** Human-facing output sink. Defaults to `process.stdout`. */
  stdout?: Pick<NodeJS.WritableStream, "write">;
  /** Error/diagnostic output sink. Defaults to `process.stderr`. */
  stderr?: Pick<NodeJS.WritableStream, "write">;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Open `url` in the system browser using a per-OS launcher:
 *   - Windows: `cmd /c start "" <url>`
 *   - macOS:   `open <url>`
 *   - Linux/other: `xdg-open <url>`
 *
 * The child is detached and unref'd so it never holds the CLI open. Resolves
 * `false` if the launcher cannot be spawned (caller then prints the URL).
 */
export function openSystemBrowser(
  url: string,
  platform: NodeJS.Platform = process.platform,
  spawnImpl: typeof spawn = spawn,
): Promise<boolean> {
  return new Promise((resolve) => {
    let command: string;
    let args: string[];
    if (platform === "win32") {
      // `start` is a cmd builtin; the empty "" is the (ignored) window title.
      command = "cmd";
      args = ["/c", "start", "", url];
    } else if (platform === "darwin") {
      command = "open";
      args = [url];
    } else {
      command = "xdg-open";
      args = [url];
    }
    try {
      const child = spawnImpl(command, args, {
        stdio: "ignore",
        detached: true,
      });
      let settled = false;
      const settle = (ok: boolean): void => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };
      child.on("error", () => settle(false));
      // If it spawned without an immediate error, consider it launched.
      child.on("spawn", () => {
        child.unref();
        settle(true);
      });
      // Fallback for runtimes that don't emit "spawn": assume success shortly.
      setTimeout(() => settle(true), 100);
    } catch {
      resolve(false);
    }
  });
}

/** Result of {@link runLogin}: the exit code the CLI should use. */
export type LoginResult = number;

/**
 * Run the full `spinshare login` device flow and persist the token on success.
 * Returns `0` on success and `1` on any failure (network, timeout, denial).
 */
export async function runLogin(deps: RunLoginDeps): Promise<LoginResult> {
  const {
    api,
    store,
    openBrowser = openSystemBrowser,
    sleep = realSleep,
    now = Date.now,
    stdout = process.stdout,
    stderr = process.stderr,
  } = deps;

  const out = (line: string): void => void stdout.write(line);
  const err = (line: string): void => void stderr.write(line);

  // Step 1: start the device flow.
  let start: Awaited<ReturnType<DeviceAuthApi["startDeviceFlow"]>>;
  try {
    start = await api.startDeviceFlow();
  } catch (e) {
    err(`Login failed: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }

  // Step 2: show the code and open the browser (print URL as a fallback).
  out(`\nTo finish signing in, confirm this code in your browser:\n\n`);
  out(`    ${start.userCode}\n\n`);
  const launched = await safeOpen(openBrowser, start.verificationUriComplete);
  if (launched) {
    out(`Opened your browser to:\n  ${start.verificationUri}\n`);
  } else {
    out(`Open this URL in your browser to continue:\n  ${start.verificationUriComplete}\n`);
  }
  out(`\nWaiting for you to approve the login...\n`);

  // Step 3: poll for the token, bounded by expiresInSec.
  const deadline = now() + start.expiresInSec * 1000;
  let intervalMs = start.intervalSec * 1000;

  for (;;) {
    if (now() >= deadline) {
      err(`Login failed: the request expired before it was approved.\n`);
      return 1;
    }
    await sleep(intervalMs);

    const poll = await api.pollDeviceToken(start.deviceCode);
    switch (poll.status) {
      case "approved": {
        try {
          await store.save(poll.accessToken);
        } catch (e) {
          err(
            `Authenticated, but could not store the token: ${
              e instanceof Error ? e.message : String(e)
            }\n`,
          );
          return 1;
        }
        out(`\nLogin successful. You're all set.\n`);
        return 0;
      }
      case "authorization_pending":
        // Keep waiting at the current interval.
        break;
      case "slow_down":
        // Server asked us to back off: increase the interval (per RFC 8628).
        intervalMs += 5000;
        break;
      case "expired_token":
        err(`Login failed: the request expired before it was approved.\n`);
        return 1;
      case "access_denied":
        err(`Login failed: the request was declined.\n`);
        return 1;
      case "error":
        err(`Login failed: ${poll.message}\n`);
        return 1;
    }
  }
}

/** Open the browser, treating any thrown error as a failed launch. */
async function safeOpen(open: BrowserLauncher, url: string): Promise<boolean> {
  try {
    return await open(url);
  } catch {
    return false;
  }
}
