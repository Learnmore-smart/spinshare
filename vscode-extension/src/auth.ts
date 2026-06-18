import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type {
  DeviceFlowStart,
  DeviceTokenResult,
  DeviceTokenValidation,
} from "./api-client";

/**
 * Authentication manager for the SpinShare VSCode extension.
 *
 * Gates ad display behind a valid {@link https://example/Device_Auth_Token}:
 * the controller must only show ads once the developer has completed the
 * browser-based device authorization grant. This manager owns that flow:
 *
 *   1. Persist/retrieve the Device_Auth_Token in `ExtensionContext.secrets`
 *      (the stable secure-storage API — available in VSCode, Trae, and Cursor).
 *   2. {@link ensureAuthenticated} prompts the developer (via
 *      `window.showInformationMessage` with a "Sign in" action) when no token
 *      is stored, then runs the device flow before any ad is shown.
 *   3. {@link signIn} drives the device flow: `POST /api/auth/device/start`,
 *      opens the verification URI in the system browser
 *      (`env.openExternal`), polls `POST /api/auth/device/token` until the
 *      device is approved/denied/expired, then persists the issued token.
 *
 * Every dependency — the `vscode` subset, the device-flow HTTP client, the
 * secret store, the clock, and `sleep` — is **injected**, mirroring how
 * `AdController` is structured, so the whole flow is unit-testable with mocks
 * and no real editor, network, or timers.
 *
 * Requirements:
 *   - 6.4 — WHERE the developer is not authenticated, prompt them to complete
 *     the browser-based authentication flow before displaying advertisements.
 */

// ---------------------------------------------------------------------------
// Injected dependency shapes (minimal stable `vscode` subset)
// ---------------------------------------------------------------------------

/**
 * The `ExtensionContext.secrets` subset used for secure token storage. Matches
 * `vscode.SecretStorage` (stable since 1.53).
 */
export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export interface TokenMirrorLike {
  save(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TokenMirrorFileSystem {
  mkdir(dirPath: string, options: { recursive: true; mode?: number }): Promise<unknown>;
  writeFile(
    filePath: string,
    data: string,
    options: { encoding: "utf8"; mode: number },
  ): Promise<unknown>;
  chmod(filePath: string, mode: number): Promise<unknown>;
  rm(filePath: string, options: { force: true }): Promise<unknown>;
}

/** Opaque URI handle (mirrors `vscode.Uri`); only passed back to `openExternal`. */
export interface UriLike {
  toString(): string;
}

/** The `vscode.window` subset this manager depends on. */
export interface AuthWindowLike {
  showInformationMessage(
    message: string,
    optionsOrItem?: { modal?: boolean } | string,
    ...items: string[]
  ): Thenable<string | undefined>;
  showErrorMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;
}

/** The `vscode.env` subset this manager depends on. */
export interface AuthEnvLike {
  openExternal(target: UriLike): Thenable<boolean>;
}

/** The `vscode.Uri` factory subset this manager depends on. */
export interface UriFactoryLike {
  parse(value: string): UriLike;
}

/** The `vscode` namespace subset this manager depends on. */
export interface AuthVsCodeLike {
  window: AuthWindowLike;
  env: AuthEnvLike;
  Uri: UriFactoryLike;
}

/** The device-flow client surface (see `AdApiClient`). */
export interface DeviceAuthClientLike {
  validateDeviceToken(token?: string): Promise<DeviceTokenValidation>;
  startDeviceFlow(): Promise<DeviceFlowStart>;
  pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult>;
}

/** Construction dependencies for {@link AuthManager}. */
export interface AuthManagerDeps {
  /** Injected `vscode` namespace subset. */
  vscode: AuthVsCodeLike;
  /** Injected device-flow HTTP client. */
  client: DeviceAuthClientLike;
  /** Secure storage for the Device_Auth_Token (`context.secrets`). */
  secrets: SecretStorageLike;
  /** Monotonic-ish clock in epoch millis. Defaults to `Date.now`. */
  now?: () => number;
  /** Delay helper used between token polls. Defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
  /** Optional sink for non-fatal errors (e.g. logging). */
  onError?: (error: unknown) => void;
  /** Optional token mirror for external Claude Code hook scripts. */
  tokenMirror?: TokenMirrorLike;
  /** SecretStorage key for the current API environment. */
  tokenSecretKey?: string;
  /** Older keys that may be migrated into `tokenSecretKey` on initialize. */
  legacyTokenSecretKeys?: string[];
  /**
   * Optional progress wrapper (e.g. `vscode.window.withProgress`) so sign-in
   * does not look like it vanished after the prompt is dismissed.
   */
  runWithProgress?: <R>(
    title: string,
    task: () => Thenable<R>,
  ) => Thenable<R>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Secret-store key under which the Device_Auth_Token is persisted. */
export const TOKEN_SECRET_KEY = "spinshare.deviceAuthToken";

export function tokenSecretKeyForBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "").toLowerCase();
  return `${TOKEN_SECRET_KEY}:${encodeURIComponent(normalized)}`;
}

/** Action label shown in the unauthenticated prompt. */
export const SIGN_IN_ACTION = "Sign in";

/** Prompt text shown when an ad would display but the developer is signed out. */
export const SIGN_IN_PROMPT =
  "Sign in to SpinShare to earn while your AI works.";

const TOKEN_FILE_MODE = 0o600;
const DEFAULT_POLL_INTERVAL_SEC = 5;
const SLOW_DOWN_BACKOFF_SEC = 5;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Outcome of a {@link AuthManager.signIn} attempt. */
export type SignInResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason: "denied" | "expired" | "cancelled" | "error";
      detail?: string;
    };

/** Human-readable failure text for UI toasts. */
export function formatSignInFailure(
  reason: Extract<SignInResult, { ok: false }>["reason"],
  detail?: string,
): string {
  switch (reason) {
    case "denied":
      return "Sign-in was denied in the browser.";
    case "expired":
      return "Sign-in timed out. Run SpinShare: Sign In to try again.";
    case "error":
      return (
        detail ??
        "Could not reach the SpinShare server. Check spinshare.baseUrl (use http://localhost:3000 for local dev)."
      );
    case "cancelled":
      return "Sign-in was cancelled.";
  }
}

export function defaultTokenMirrorFilePath(
  env: Record<string, string | undefined> = process.env,
  homedir: string = os.homedir(),
): string {
  const configBase =
    env.XDG_CONFIG_HOME ?? env.APPDATA ?? path.join(homedir, ".config");
  return path.join(configBase, "spinshare", "credentials.json");
}

export class FileTokenMirror implements TokenMirrorLike {
  constructor(
    private readonly filePath: string = defaultTokenMirrorFilePath(),
    private readonly fileSystem: TokenMirrorFileSystem = fs,
    private readonly baseUrl?: string,
  ) {}

  async save(token: string): Promise<void> {
    await this.fileSystem.mkdir(path.dirname(this.filePath), {
      recursive: true,
      mode: 0o700,
    });
    await this.fileSystem.writeFile(
      this.filePath,
      `${JSON.stringify(
        this.baseUrl ? { token, baseUrl: this.baseUrl } : { token },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: TOKEN_FILE_MODE },
    );
    try {
      await this.fileSystem.chmod(this.filePath, TOKEN_FILE_MODE);
    } catch {
      // Best effort on filesystems where chmod is unavailable/no-op.
    }
  }

  async clear(): Promise<void> {
    await this.fileSystem.rm(this.filePath, { force: true });
  }
}

/**
 * Owns the Device_Auth_Token lifecycle and the interactive sign-in flow.
 *
 * The current token is cached in memory after the first read so the
 * controller's synchronous `getToken()` hook can consult it without awaiting
 * secure storage on every ad. Call {@link initialize} once on activation to
 * warm that cache from persisted storage.
 */
export class AuthManager {
  private readonly vscode: AuthVsCodeLike;
  private readonly client: DeviceAuthClientLike;
  private readonly secrets: SecretStorageLike;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly onError: (error: unknown) => void;
  private readonly tokenMirror: TokenMirrorLike | undefined;
  private readonly tokenSecretKey: string;
  private readonly legacyTokenSecretKeys: string[];
  private readonly runWithProgress: <R>(
    title: string,
    task: () => Thenable<R>,
  ) => Thenable<R>;
  /** Last device/start error message for user-facing toasts. */
  private lastSignInErrorDetail: string | undefined;

  /** In-memory cache of the persisted token (`undefined` = unknown/none). */
  private cachedToken: string | undefined;
  /** Whether {@link initialize} has loaded the cache from storage. */
  private loaded = false;
  /** Guards against launching two concurrent device flows. */
  private signInInFlight: Promise<SignInResult> | null = null;

  constructor(deps: AuthManagerDeps) {
    this.vscode = deps.vscode;
    this.client = deps.client;
    this.secrets = deps.secrets;
    this.now = deps.now ?? (() => Date.now());
    this.sleep = deps.sleep ?? defaultSleep;
    this.onError = deps.onError ?? (() => {});
    this.tokenMirror = deps.tokenMirror;
    this.tokenSecretKey = deps.tokenSecretKey ?? TOKEN_SECRET_KEY;
    this.legacyTokenSecretKeys = deps.legacyTokenSecretKeys ?? [];
    this.runWithProgress =
      deps.runWithProgress ?? (async (_title, task) => task());
  }

  /**
   * Warm the in-memory token cache from secure storage. Idempotent; safe to
   * call once on activation. Returns the loaded token (or `undefined`).
   */
  async initialize(): Promise<string | undefined> {
    if (!this.loaded) {
      try {
        this.cachedToken =
          (await this.secrets.get(this.tokenSecretKey)) ?? undefined;
        if (this.cachedToken === undefined || this.cachedToken === "") {
          for (const legacyKey of this.legacyTokenSecretKeys) {
            const legacyToken = await this.secrets.get(legacyKey);
            if (legacyToken !== undefined && legacyToken !== "") {
              this.cachedToken = legacyToken;
              try {
                await this.secrets.store(this.tokenSecretKey, legacyToken);
              } catch (error) {
                this.onError(error);
              }
              break;
            }
          }
        }
        if (this.cachedToken !== undefined && this.cachedToken !== "") {
          const validation = await this.validateStoredToken(this.cachedToken);
          if (validation === "invalid") {
            await this.clearPersistedToken();
            this.cachedToken = undefined;
          } else {
            try {
              await this.tokenMirror?.save(this.cachedToken);
            } catch (error) {
              this.onError(error);
            }
          }
        }
      } catch (error) {
        this.onError(error);
        this.cachedToken = undefined;
      }
      this.loaded = true;
    }
    return this.cachedToken;
  }

  /**
   * Synchronous accessor for the cached token, suitable as the
   * `AdController` `getToken` hook. Returns `undefined` until {@link initialize}
   * (or a successful {@link signIn}) has populated the cache.
   */
  getToken(): string | undefined {
    return this.cachedToken;
  }

  /**
   * True when a Device_Auth_Token is available. Loads from storage on first
   * use so callers need not call {@link initialize} explicitly.
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.loaded) {
      await this.initialize();
    }
    return this.cachedToken !== undefined && this.cachedToken !== "";
  }

  /**
   * Ensure the developer is authenticated before ads display (Requirement 6.4).
   *
   * If a token already exists, returns it immediately. Otherwise prompts the
   * developer with a "Sign in" action; if they accept, runs the device flow and
   * returns the issued token. Returns `undefined` if the developer dismisses
   * the prompt or sign-in fails — callers must then **not** display an ad.
   */
  async ensureAuthenticated(): Promise<string | undefined> {
    if (await this.isAuthenticated()) {
      return this.cachedToken;
    }

    const choice = await this.vscode.window.showInformationMessage(
      SIGN_IN_PROMPT,
      { modal: true },
      SIGN_IN_ACTION,
    );
    if (choice !== SIGN_IN_ACTION) {
      return undefined;
    }

    const result = await this.signIn();
    if (!result.ok) {
      if (result.reason !== "cancelled") {
        void this.vscode.window.showErrorMessage(
          formatSignInFailure(result.reason, result.detail),
        );
      }
      return undefined;
    }
    return result.token;
  }

  /**
   * Run the browser-based device authorization grant end to end and persist the
   * resulting token on success.
   *
   * Concurrent calls share a single in-flight flow. The poll loop honors the
   * server `intervalSec`, backs off on `slow_down`, and is bounded by the
   * server `expiresInSec` deadline so it can never spin forever.
   */
  signIn(): Promise<SignInResult> {
    if (this.signInInFlight !== null) {
      return this.signInInFlight;
    }
    const flow = Promise.resolve(
      this.runWithProgress("SpinShare: waiting for browser sign-in…", () =>
        this.runDeviceFlow(),
      ),
    ).finally(() => {
      this.signInInFlight = null;
    });
    this.signInInFlight = flow;
    return flow;
  }

  /** Remove the persisted token and clear the cache. */
  async signOut(): Promise<void> {
    await this.clearPersistedToken();
    this.cachedToken = undefined;
    this.loaded = true;
  }

  private async clearPersistedToken(): Promise<void> {
    try {
      await this.secrets.delete(this.tokenSecretKey);
      for (const legacyKey of this.legacyTokenSecretKeys) {
        await this.secrets.delete(legacyKey);
      }
    } catch (error) {
      this.onError(error);
    }
    try {
      await this.tokenMirror?.clear();
    } catch (error) {
      this.onError(error);
    }
  }

  private async validateStoredToken(
    token: string,
  ): Promise<DeviceTokenValidation> {
    try {
      return await this.client.validateDeviceToken(token);
    } catch (error) {
      this.onError(error);
      return "unknown";
    }
  }

  private async runDeviceFlow(): Promise<SignInResult> {
    this.lastSignInErrorDetail = undefined;
    let start: DeviceFlowStart;
    try {
      start = await this.client.startDeviceFlow();
    } catch (error) {
      this.onError(error);
      this.lastSignInErrorDetail =
        error instanceof Error ? error.message : "device/start failed";
      return { ok: false, reason: "error", detail: this.lastSignInErrorDetail };
    }

    let opened = false;
    try {
      const uri = this.vscode.Uri.parse(start.verificationUriComplete);
      opened = await this.vscode.env.openExternal(uri);
    } catch (error) {
      this.onError(error);
    }

    if (!opened) {
      void this.vscode.window.showInformationMessage(
        `Open ${start.verificationUriComplete} in your browser and enter code ${start.userCode}.`,
      );
    }

    let intervalMs =
      Math.max(start.intervalSec || DEFAULT_POLL_INTERVAL_SEC, 1) * 1000;
    const deadline =
      this.now() + Math.max(start.expiresInSec, 0) * 1000;

    // Poll until approved/denied/expired or the device code deadline passes.
    while (this.now() < deadline) {
      await this.sleep(intervalMs);

      let result: DeviceTokenResult;
      try {
        result = await this.client.pollDeviceToken(start.deviceCode);
      } catch (error) {
        this.onError(error);
        result = { status: "pending" };
      }

      switch (result.status) {
        case "approved":
          await this.persistToken(result.accessToken);
          return { ok: true, token: result.accessToken };
        case "denied":
          return { ok: false, reason: "denied" };
        case "expired":
          return { ok: false, reason: "expired" };
        case "slow_down":
          intervalMs += SLOW_DOWN_BACKOFF_SEC * 1000;
          break;
        case "pending":
        default:
          break;
      }
    }

    // Deadline elapsed without approval.
    return { ok: false, reason: "expired" };
  }

  private async persistToken(token: string): Promise<void> {
    try {
      await this.secrets.store(this.tokenSecretKey, token);
    } catch (error) {
      // Even if persistence fails, keep the token in memory for this session.
      this.onError(error);
    }
    try {
      await this.tokenMirror?.save(token);
    } catch (error) {
      this.onError(error);
    }
    this.cachedToken = token;
    this.loaded = true;
  }
}
