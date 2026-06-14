/**
 * End-to-end test harness for `@spinshare/web`.
 *
 * Starts a real Next.js server in `SPINSHARE_MODE=local` on an ephemeral port
 * and polls `GET /api/health` until it returns `200`, failing after a 60-second
 * startup timeout (design "`npm run test:e2e` design" step 1; Requirements 11.1
 * and 11.8). The returned {@link RunningApp} exposes the resolved `baseUrl` and
 * a `stop()` teardown, so the settlement test (task 15.2) can:
 *
 * ```ts
 * const app = await startApp();
 * try {
 *   // seed + track + flush + assert against `app.baseUrl`
 * } finally {
 *   await app.stop();
 * }
 * ```
 *
 * ## Why `next dev` (not `next build && next start`)
 *
 * `@spinshare/core` ships an ESM+CJS+`.d.ts` build, but a production
 * (`next build`) bundle resolves its built `dist` exports, which currently
 * surface "Attempted import error … from @spinshare/core" warnings. `next dev`
 * consumes the workspace TypeScript source via `transpilePackages`
 * (see `next.config.mjs`), sidestepping the dist-resolution issue entirely, and
 * needs no separate build step. That makes it the reliable choice for serving
 * `/api/*` (including `/api/health`) in this environment, so the harness starts
 * the dev server by default. Set `SPINSHARE_E2E_NEXT_CMD=start` to opt into
 * `next start` instead (assumes a prior `next build`).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Absolute path to the `@spinshare/web` package root (two levels up). */
const WEB_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** Path to the locally-installed Next.js CLI entrypoint, spawned via `node`. */
const NEXT_BIN = path.join(WEB_ROOT, "node_modules", "next", "dist", "bin", "next");

/** Startup readiness budget — the app must answer `/api/health` within this. */
export const STARTUP_TIMEOUT_MS = 60_000;

/** Interval between `/api/health` readiness polls. */
const POLL_INTERVAL_MS = 500;

/** Per-poll fetch timeout (health probe should respond near-instantly). */
const POLL_FETCH_TIMEOUT_MS = 2_000;

/** Default time to wait for graceful server process exit before force kill. */
const DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS = 1_500;

/** Default maximum time to wait after a forced shutdown request. */
const DEFAULT_FORCE_SHUTDOWN_TIMEOUT_MS = 3_000;

/** The base environment the e2e server runs under (credential-free local). */
const LOCAL_E2E_ENV: Record<string, string> = {
  SPINSHARE_MODE: "local",
  STRIPE_MODE: "mock",
  AUTH_MODE: "mock",
  SPINSHARE_COUNTER: "memory",
};

/** A started Next.js server plus the means to address and tear it down. */
export interface RunningApp {
  /** Base URL (e.g. `http://127.0.0.1:54321`) with no trailing slash. */
  readonly baseUrl: string;
  /** The port the server is listening on. */
  readonly port: number;
  /** Terminates the server process (and its child workers) and resolves. */
  stop(): Promise<void>;
}

/** Options for {@link startApp}; all optional with local-mode defaults. */
export interface StartAppOptions {
  /** Extra environment overrides merged over the local e2e defaults. */
  env?: Record<string, string | undefined>;
  /** Override the startup readiness timeout (ms). Defaults to 60s. */
  startupTimeoutMs?: number;
  /** Fixed port to bind; defaults to an OS-assigned ephemeral free port. */
  port?: number;
}

/** Options for terminating the spawned server process tree. */
export interface TerminateProcessTreeOptions {
  /** Time to wait after graceful termination before escalating. */
  gracefulTimeoutMs?: number;
  /** Time to wait after forced termination before returning. */
  forceTimeoutMs?: number;
}

/**
 * Asks the OS for a currently-free TCP port by binding to port `0`, reading the
 * assigned port, then releasing it. There is an inherent (small) race between
 * release and the server re-binding; acceptable for local test orchestration.
 */
export async function getFreePort(): Promise<number> {
  const server = createServer();
  server.unref();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Failed to acquire an ephemeral port from the OS.");
  }
  const { port } = address;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  return port;
}

/** Sleeps for the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Probes `GET {baseUrl}/api/health` once. Resolves `true` only on HTTP `200`;
 * any non-200, network error, or timeout resolves `false` (server not ready
 * yet). Never throws so the poll loop can keep retrying until the deadline.
 */
async function isHealthy(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Whether a child process has already exited. */
function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

/** Waits for a child process to exit, returning false on timeout. */
function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (hasExited(child)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      child.removeListener("exit", onExit);
    };
    const onExit = (): void => {
      cleanup();
      resolve(true);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    child.once("exit", onExit);
  });
}

/** Runs Windows taskkill as a bounded best-effort fallback. */
function forceKillWindows(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.pid === undefined || hasExited(child)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    const cleanup = (): void => {
      clearTimeout(timer);
      killer.removeListener("exit", onDone);
      killer.removeListener("error", onDone);
    };
    const onDone = (): void => {
      cleanup();
      resolve();
    };
    const timer = setTimeout(() => {
      cleanup();
      killer.kill();
      resolve();
    }, timeoutMs);

    killer.once("exit", onDone);
    killer.once("error", onDone);
  });
}

/**
 * Terminates a spawned child process tree without waiting forever.
 *
 * The normal path asks the direct child to exit and waits briefly. On Windows,
 * `taskkill /T` is only used as a bounded fallback, because invoking it as the
 * first shutdown step can destabilize the Vitest worker that owns the spawned
 * Next.js server. Non-Windows platforms escalate from SIGTERM to SIGKILL.
 */
export async function terminateProcessTree(
  child: ChildProcess,
  options: TerminateProcessTreeOptions = {},
): Promise<void> {
  const gracefulTimeoutMs =
    options.gracefulTimeoutMs ?? DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS;
  const forceTimeoutMs =
    options.forceTimeoutMs ?? DEFAULT_FORCE_SHUTDOWN_TIMEOUT_MS;

  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) {
    return;
  }

  child.kill();
  if (await waitForExit(child, gracefulTimeoutMs)) {
    return;
  }

  if (process.platform === "win32") {
    await forceKillWindows(child, forceTimeoutMs);
  } else {
    child.kill("SIGKILL");
  }
  await waitForExit(child, forceTimeoutMs);
}

/**
 * Starts the Next.js app in local e2e mode and waits for readiness.
 *
 * Spawns the dev server (or `next start` when `SPINSHARE_E2E_NEXT_CMD=start`)
 * on an ephemeral port, then polls `/api/health` until it returns `200`. If the
 * server has not become ready within {@link StartAppOptions.startupTimeoutMs}
 * (default {@link STARTUP_TIMEOUT_MS}), or the process exits early, the server
 * is torn down and an error is thrown that includes captured output and the
 * startup-failure cause (Requirement 11.8).
 *
 * @returns A {@link RunningApp} with `baseUrl`, `port`, and `stop()`.
 */
export async function startApp(options: StartAppOptions = {}): Promise<RunningApp> {
  const startupTimeoutMs = options.startupTimeoutMs ?? STARTUP_TIMEOUT_MS;
  const port = options.port ?? (await getFreePort());
  const host = "127.0.0.1";
  const baseUrl = `http://${host}:${port}`;

  const command = (process.env.SPINSHARE_E2E_NEXT_CMD ?? "dev").trim();
  const nextSubcommand = command === "start" ? "start" : "dev";

  const child = spawn(
    process.execPath,
    [NEXT_BIN, nextSubcommand, "-H", host, "-p", String(port)],
    {
      cwd: WEB_ROOT,
      env: {
        ...process.env,
        ...LOCAL_E2E_ENV,
        ...options.env,
        // Pin the port for libraries that read PORT directly.
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  // Buffer recent output for diagnostics on failure (bounded to avoid growth).
  let logTail = "";
  const appendLog = (chunk: Buffer): void => {
    logTail = (logTail + chunk.toString()).slice(-8_000);
  };
  child.stdout?.on("data", appendLog);
  child.stderr?.on("data", appendLog);

  // Track early exit so the poll loop can fail fast with a clear cause.
  let exitInfo: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  child.on("exit", (code, signal) => {
    exitInfo = { code, signal };
  });

  const stop = async (): Promise<void> => {
    child.stdout?.removeListener("data", appendLog);
    child.stderr?.removeListener("data", appendLog);
    await terminateProcessTree(child);
  };

  const deadline = Date.now() + startupTimeoutMs;
  try {
    while (Date.now() < deadline) {
      if (exitInfo !== undefined) {
        throw new Error(
          `Next.js (${nextSubcommand}) exited before becoming ready ` +
            `(code=${exitInfo.code}, signal=${exitInfo.signal}).\n` +
            `--- server output ---\n${logTail}`,
        );
      }
      if (await isHealthy(baseUrl)) {
        return { baseUrl, port, stop };
      }
      await delay(POLL_INTERVAL_MS);
    }
    throw new Error(
      `Web application did not accept requests at ${baseUrl}/api/health within ` +
        `${startupTimeoutMs}ms startup timeout (Requirement 11.8).\n` +
        `--- server output ---\n${logTail}`,
    );
  } catch (error) {
    await stop();
    throw error;
  }
}
