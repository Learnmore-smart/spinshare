/**
 * @spinshare/cli — Device_Auth_Token credential storage (task 13.7).
 *
 * The CLI stores the Device_Auth_Token issued by the browser device flow so it
 * can be reused on subsequent runs (Requirement 4.5). Two implementations are
 * provided behind a single {@link CredentialStore} interface:
 *
 *   - {@link KeytarCredentialStore} — uses the OS keychain via the optional
 *     `keytar` dependency. `keytar` is loaded **lazily** through a try/catch
 *     dynamic import so its absence (it is an optional, native dependency) never
 *     breaks install, build, or runtime.
 *   - {@link FileCredentialStore} — a JSON file written with `0600` permissions
 *     under the user config dir. Its `filePath` and filesystem are injectable so
 *     the storage round-trip can be property-tested (task 13.8).
 *
 * {@link createCredentialStore} picks keytar when available, else the file store.
 * The {@link CredentialStore} interface is the clean, testable contract that the
 * Property 20 round-trip test (task 13.8) consumes against a mock store.
 *
 * Requirements: 4.5 (store token for reuse on subsequent runs).
 */

import * as os from "node:os";
import * as path from "node:path";
import * as nodeFs from "node:fs/promises";

/**
 * Persistent storage for a single Device_Auth_Token.
 *
 * Implementations MUST satisfy the round-trip law: after `save(t)`, a subsequent
 * `load()` resolves to `t`; after `clear()`, `load()` resolves to `null`.
 */
export interface CredentialStore {
  /** Return the stored token, or `null` if none is stored. */
  load(): Promise<string | null>;
  /** Persist `token`, replacing any previously stored value. */
  save(token: string): Promise<void>;
  /** Remove any stored token. Idempotent (no error if nothing is stored). */
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// File-based credential store (injectable fs + path)
// ---------------------------------------------------------------------------

/** The minimal async filesystem surface {@link FileCredentialStore} needs. */
export interface CredentialFileFs {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, data: string, mode: number): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  chmod(filePath: string, mode: number): Promise<void>;
  rm(filePath: string): Promise<void>;
}

/** Owner-read/write only — the required mode for the fallback credential file. */
export const CREDENTIAL_FILE_MODE = 0o600;

/** Normalize a base URL for environment comparison (trim, drop trailing slash, lowercase). */
function normalizeCredentialBaseUrl(value: string | undefined): string {
  return typeof value === "string"
    ? value.trim().replace(/\/+$/, "").toLowerCase()
    : "";
}

/**
 * Whether a stored credential is usable by a store configured for
 * `configuredBaseUrl`. Prevents silently using a token issued for one
 * environment against another (Bug B: local/prod credential mixing):
 *   - no configured baseUrl (legacy caller) -> accept (nothing to enforce);
 *   - configured baseUrl with no stored baseUrl -> reject as ambiguous;
 *   - both present → must match exactly.
 *
 * The generated Claude Code hook applies a *stricter* rule (it rejects an
 * untagged credential outright) because it auto-reports in the background; the
 * interactive CLI follows the same rule whenever it knows the target base URL.
 */
function credentialEnvMatches(
  configuredBaseUrl: string | undefined,
  storedBaseUrl: string | undefined,
): boolean {
  const configured = normalizeCredentialBaseUrl(configuredBaseUrl);
  const stored = normalizeCredentialBaseUrl(storedBaseUrl);
  if (configured.length === 0) return true;
  if (stored.length === 0) return false;
  return configured === stored;
}

/** Parse a stored credential value, tolerating the legacy bare-token format. */
function parseStoredCredential(raw: string): {
  token: string | null;
  baseUrl: string | undefined;
} {
  try {
    const parsed = JSON.parse(raw) as CredentialFileShape;
    return {
      token:
        typeof parsed.token === "string" && parsed.token.length > 0
          ? parsed.token
          : null,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
    };
  } catch {
    // Legacy keytar value: a bare token string (pre-JSON format).
    return { token: raw.length > 0 ? raw : null, baseUrl: undefined };
  }
}

/** Default {@link CredentialFileFs} backed by `node:fs/promises`. */
export const defaultCredentialFileFs: CredentialFileFs = {
  async readFile(filePath) {
    return nodeFs.readFile(filePath, "utf8");
  },
  async writeFile(filePath, data, mode) {
    await nodeFs.writeFile(filePath, data, { mode, encoding: "utf8" });
  },
  async mkdir(dirPath) {
    await nodeFs.mkdir(dirPath, { recursive: true, mode: 0o700 });
  },
  async chmod(filePath, mode) {
    await nodeFs.chmod(filePath, mode);
  },
  async rm(filePath) {
    await nodeFs.rm(filePath, { force: true });
  },
};

/**
 * Resolve the default credential file path under the user config dir.
 *
 * Honors `XDG_CONFIG_HOME` (POSIX) and `APPDATA` (Windows) when set, otherwise
 * falls back to `~/.config`. The token lives at `<configDir>/spinshare/credentials.json`.
 */
export function defaultCredentialFilePath(
  env: NodeJS.ProcessEnv = process.env,
  homedir: string = os.homedir(),
): string {
  const configBase =
    env.XDG_CONFIG_HOME ?? env.APPDATA ?? path.join(homedir, ".config");
  return path.join(configBase, "spinshare", "credentials.json");
}

/** Construction options for {@link FileCredentialStore}. */
export interface FileCredentialStoreOptions {
  /** Absolute path to the credentials JSON file. */
  filePath?: string;
  /** Injectable filesystem; defaults to {@link defaultCredentialFileFs}. */
  fs?: CredentialFileFs;
  /** API base URL this token belongs to, written as metadata for generated hooks. */
  baseUrl?: string;
}

interface CredentialFileShape {
  token?: unknown;
  baseUrl?: unknown;
}

/**
 * Stores the token as `{ "token": "..." }` JSON in a `0600` file. The directory
 * is created on demand; the file mode is enforced on every write (and via an
 * explicit `chmod`) so an existing world-readable file is tightened.
 */
export class FileCredentialStore implements CredentialStore {
  readonly filePath: string;
  private readonly fs: CredentialFileFs;
  private readonly baseUrl?: string;

  constructor(options: FileCredentialStoreOptions = {}) {
    this.filePath = options.filePath ?? defaultCredentialFilePath();
    this.fs = options.fs ?? defaultCredentialFileFs;
    this.baseUrl = options.baseUrl;
  }

  async load(): Promise<string | null> {
    let raw: string;
    try {
      raw = await this.fs.readFile(this.filePath);
    } catch {
      return null; // missing/unreadable file → no stored token
    }
    let parsed: CredentialFileShape;
    try {
      parsed = JSON.parse(raw) as CredentialFileShape;
    } catch {
      return null; // corrupt file → treat as no token
    }
    if (typeof parsed.token !== "string" || parsed.token.length === 0) {
      return null;
    }
    const storedBaseUrl =
      typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined;
    // Refuse a token issued for a different environment than this store targets.
    return credentialEnvMatches(this.baseUrl, storedBaseUrl)
      ? parsed.token
      : null;
  }

  async save(token: string): Promise<void> {
    await this.fs.mkdir(path.dirname(this.filePath));
    const body = `${JSON.stringify(
      this.baseUrl ? { token, baseUrl: this.baseUrl } : { token },
      null,
      2,
    )}\n`;
    await this.fs.writeFile(this.filePath, body, CREDENTIAL_FILE_MODE);
    // Enforce 0600 even if the file pre-existed with looser permissions.
    try {
      await this.fs.chmod(this.filePath, CREDENTIAL_FILE_MODE);
    } catch {
      // chmod is a best-effort hardening step (e.g. no-op on some Windows FS).
    }
  }

  async clear(): Promise<void> {
    try {
      await this.fs.rm(this.filePath);
    } catch {
      // Already absent — clearing is idempotent.
    }
  }
}

// ---------------------------------------------------------------------------
// Keytar-based credential store (optional, lazily loaded)
// ---------------------------------------------------------------------------

/** The subset of the `keytar` module surface this store uses. */
export interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

/** Service/account identifiers used in the OS keychain. */
export const KEYTAR_SERVICE = "spinshare";
export const KEYTAR_ACCOUNT = "device-auth-token";

/**
 * Lazily and safely load the optional `keytar` module. Returns `null` when it is
 * not installed or fails to load (e.g. missing native bindings) so the caller
 * can fall back to the file store. Never throws.
 */
export async function loadKeytar(): Promise<KeytarLike | null> {
  try {
    // Computed specifier so `tsc` does not require keytar's types and esbuild
    // does not try to bundle it — keytar is an optional native dependency that
    // may be absent. The dynamic import resolves it lazily at runtime only.
    const specifier = ["key", "tar"].join("");
    const mod: unknown = await import(specifier);
    const candidate =
      mod && typeof mod === "object" && "default" in mod
        ? (mod as { default: unknown }).default
        : mod;
    if (
      candidate &&
      typeof (candidate as KeytarLike).getPassword === "function" &&
      typeof (candidate as KeytarLike).setPassword === "function" &&
      typeof (candidate as KeytarLike).deletePassword === "function"
    ) {
      return candidate as KeytarLike;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Stores the token in the OS keychain via an injected/loaded `keytar`.
 *
 * Environment-aware: when constructed with a `baseUrl`, the token is persisted
 * as `{ token, baseUrl }` JSON and `load()` refuses a token tagged for a
 * different environment, so a local and a production CLI login never reuse each
 * other's token. Legacy bare-token values are read only by callers that do not
 * configure a target base URL.
 */
export class KeytarCredentialStore implements CredentialStore {
  constructor(
    private readonly keytar: KeytarLike,
    private readonly service: string = KEYTAR_SERVICE,
    private readonly account: string = KEYTAR_ACCOUNT,
    private readonly baseUrl?: string,
  ) {}

  async load(): Promise<string | null> {
    const raw = await this.keytar.getPassword(this.service, this.account);
    if (raw === null || raw.length === 0) {
      return null;
    }
    const { token, baseUrl } = parseStoredCredential(raw);
    if (token === null) {
      return null;
    }
    return credentialEnvMatches(this.baseUrl, baseUrl) ? token : null;
  }

  async save(token: string): Promise<void> {
    const payload = this.baseUrl ? { token, baseUrl: this.baseUrl } : { token };
    await this.keytar.setPassword(
      this.service,
      this.account,
      JSON.stringify(payload),
    );
  }

  async clear(): Promise<void> {
    await this.keytar.deletePassword(this.service, this.account);
  }
}

/** Options for {@link createCredentialStore}. */
export interface CreateCredentialStoreOptions {
  /** Override the file-store path (used when keytar is unavailable). */
  filePath?: string;
  /** Injectable filesystem for the file store. */
  fs?: CredentialFileFs;
  /** API base URL metadata for the file store. */
  baseUrl?: string;
  /** Injectable keytar loader; defaults to {@link loadKeytar}. */
  keytarLoader?: () => Promise<KeytarLike | null>;
}

/**
 * Build the best available {@link CredentialStore}: the OS keychain via keytar
 * when it loads, otherwise the `0600` file store. Always resolves to a working
 * store — keytar's absence is not an error.
 */
export async function createCredentialStore(
  options: CreateCredentialStoreOptions = {},
): Promise<CredentialStore> {
  const loader = options.keytarLoader ?? loadKeytar;
  const keytar = await loader();
  if (keytar !== null) {
    return new KeytarCredentialStore(
      keytar,
      KEYTAR_SERVICE,
      KEYTAR_ACCOUNT,
      options.baseUrl,
    );
  }
  return new FileCredentialStore({
    ...(options.filePath !== undefined ? { filePath: options.filePath } : {}),
    ...(options.fs !== undefined ? { fs: options.fs } : {}),
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
  });
}
