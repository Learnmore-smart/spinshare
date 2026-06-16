/**
 * @spinshare/cli child-process wrapper with impression reporting.
 *
 * The wrapper intercepts spinner-only stdout frames, shows a cached ad through
 * the renderer, and reports view segments so the server can settle cumulative
 * 3-second viewability without losing short waits.
 */

import { spawn, type SpawnOptions } from "node:child_process";
import * as os from "node:os";

import type { AdResponse, TrackResponse } from "@spinshare/core";

import { CliApiClient } from "./api-client.js";
import { SpinnerRenderer } from "./renderer.js";

const VIEWABILITY_MIN_MS = 3_000;

// ---------------------------------------------------------------------------
// Pure unit 1: wait-state tracking / impression debounce
// ---------------------------------------------------------------------------

/** Classification of a single output frame, as produced by SpinnerRenderer. */
export interface FrameClassification {
  /** True when the frame was a spinner-only wait-state frame. */
  spinner: boolean;
  /** Optional timestamp used by pure tests. */
  atMs?: number;
}

/** Result of feeding one frame to a WaitStateTracker. */
export interface WaitStateStep {
  /** True exactly once when the active wait state reaches the viewability floor. */
  impression: boolean;
  /** True while the tracker is currently inside a wait state. */
  inWaitState: boolean;
  /** Milliseconds elapsed in the current wait state. */
  viewDurationMs: number;
}

/**
 * Pure state machine for contiguous spinner wait states.
 *
 * A wait state begins at the first spinner frame and ends as soon as a
 * non-spinner frame resumes. It emits one impression only after the active run
 * reaches the configured minimum duration.
 */
export class WaitStateTracker {
  private inWaitState = false;
  private waitStartedAtMs = 0;
  private reported = false;

  constructor(private readonly minViewMs = VIEWABILITY_MIN_MS) {}

  /** Feed one frame; returns whether it qualifies for an impression. */
  observe(frame: FrameClassification, nowMs = Date.now()): WaitStateStep {
    if (frame.spinner) {
      if (!this.inWaitState) {
        this.inWaitState = true;
        this.waitStartedAtMs = nowMs;
        this.reported = false;
        return { impression: false, inWaitState: true, viewDurationMs: 0 };
      }
      return this.qualify(nowMs);
    }

    this.reset();
    return { impression: false, inWaitState: false, viewDurationMs: 0 };
  }

  /**
   * Evaluate the currently active wait state without requiring another stdout
   * frame. This is used by the runtime timer so quiet long waits still count.
   */
  qualify(nowMs = Date.now(), minViewMs = this.minViewMs): WaitStateStep {
    if (!this.inWaitState) {
      return { impression: false, inWaitState: false, viewDurationMs: 0 };
    }

    const viewDurationMs = Math.max(0, nowMs - this.waitStartedAtMs);
    const impression = !this.reported && viewDurationMs >= minViewMs;
    if (impression) {
      this.reported = true;
    }

    return { impression, inWaitState: true, viewDurationMs };
  }

  /**
   * End the active wait state and return the final segment duration.
   *
   * A short segment is still reportable now: the server records it as progress
   * and only settles money once cumulative view time reaches 3 seconds.
   */
  finish(nowMs = Date.now()): WaitStateStep {
    if (!this.inWaitState) {
      return { impression: false, inWaitState: false, viewDurationMs: 0 };
    }

    const viewDurationMs = Math.max(0, nowMs - this.waitStartedAtMs);
    const impression = !this.reported && viewDurationMs > 0;
    this.reset();
    return { impression, inWaitState: false, viewDurationMs };
  }

  /** True while inside a contiguous spinner run. */
  get active(): boolean {
    return this.inWaitState;
  }

  /** Reset to the initial no-wait-state state. */
  reset(): void {
    this.inWaitState = false;
    this.waitStartedAtMs = 0;
    this.reported = false;
  }
}

/** Count qualifying impressions for a timestamped frame sequence. */
export function countImpressions(
  frames: ReadonlyArray<FrameClassification>,
): number {
  const tracker = new WaitStateTracker();
  let count = 0;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame === undefined) continue;
    const nowMs = frame.atMs ?? i;
    if (tracker.observe(frame, nowMs).impression) {
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Pure unit 2: exit-code mapping
// ---------------------------------------------------------------------------

export function exitCodeFor(
  code: number | null,
  signal: NodeJS.Signals | string | null,
  signalNumbers: Record<string, number> = os.constants.signals,
): number {
  if (signal != null) {
    const num = signalNumbers[signal as string];
    return 128 + (typeof num === "number" ? num : 0);
  }
  return code ?? 0;
}

export function spawnOptionsForPlatform(
  platform: NodeJS.Platform = process.platform,
): SpawnOptions {
  return {
    stdio: ["inherit", "pipe", "pipe"],
    ...(platform === "win32" ? { shell: true } : {}),
  };
}

export interface PtySpawnOptionsLike {
  name: string;
  cols: number;
  rows: number;
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface PtyProcessLike {
  onData(handler: (data: string) => void): void | { dispose(): void };
  onExit(
    handler: (event: { exitCode: number; signal?: number }) => void,
  ): void | { dispose(): void };
  write(data: string): void;
  resize?(cols: number, rows: number): void;
  kill?(): void;
}

export type PtySpawnLike = (
  file: string,
  args: string[],
  options: PtySpawnOptionsLike,
) => PtyProcessLike;

interface PtyCommand {
  file: string;
  args: string[];
}

function quoteWindowsArg(value: string): string {
  if (value.length > 0 && !/[\s"&|<>^]/.test(value)) {
    return value;
  }

  let result = '"';
  let backslashes = 0;
  for (const ch of value) {
    if (ch === "\\") {
      backslashes += 1;
      continue;
    }
    if (ch === '"') {
      result += "\\".repeat(backslashes * 2 + 1);
      result += ch;
      backslashes = 0;
      continue;
    }
    result += "\\".repeat(backslashes);
    result += ch;
    backslashes = 0;
  }
  result += "\\".repeat(backslashes * 2);
  result += '"';
  return result;
}

export function ptyCommandForPlatform(
  target: string,
  args: string[],
  platform: NodeJS.Platform = process.platform,
  comSpec = process.env.ComSpec ?? "cmd.exe",
): PtyCommand {
  if (platform !== "win32") {
    return { file: target, args };
  }

  return {
    file: comSpec,
    args: ["/d", "/s", "/c", [target, ...args].map(quoteWindowsArg).join(" ")],
  };
}

async function loadPtySpawn(): Promise<PtySpawnLike | null> {
  try {
    const mod = await import("@homebridge/node-pty-prebuilt-multiarch");
    const candidate = (
      "default" in mod && mod.default ? mod.default : mod
    ) as { spawn?: unknown };
    return typeof candidate.spawn === "function"
      ? (candidate.spawn as PtySpawnLike)
      : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Thin spawning shell around the pure units
// ---------------------------------------------------------------------------

/** Options for runWrap, all injectable for testability. */
export interface RunWrapOptions {
  /** Target command to spawn. */
  target: string;
  /** Arguments forwarded to the target command. */
  args: string[];
  /** API client; defaults to a CliApiClient reading env config. */
  client?: Pick<CliApiClient, "getAd" | "reportImpression">;
  /** Real stdin source; defaults to process.stdin. Used by the PTY path. */
  stdin?: NodeJS.ReadableStream;
  /** Real stdout sink; defaults to process.stdout. */
  stdout?: NodeJS.WritableStream;
  /** Real stderr sink; defaults to process.stderr. */
  stderr?: NodeJS.WritableStream;
  /** Spawner for tests. */
  spawnImpl?: typeof spawn;
  /** PTY spawner for tests or explicit fallback control. */
  ptySpawnImpl?: PtySpawnLike | null;
}

interface AdCache {
  current: AdResponse;
}

type TimerHandle = ReturnType<typeof setTimeout>;

function terminalSize(stdout: NodeJS.WritableStream): { cols: number; rows: number } {
  const stream = stdout as NodeJS.WritableStream & {
    columns?: number;
    rows?: number;
  };
  return {
    cols: stream.columns ?? process.stdout.columns ?? 80,
    rows: stream.rows ?? process.stdout.rows ?? 24,
  };
}

function ptyInput(chunk: Buffer | string): string {
  return typeof chunk === "string" ? chunk : chunk.toString("utf8");
}

function attachStdinToPty(
  stdin: NodeJS.ReadableStream,
  pty: PtyProcessLike,
): () => void {
  const input = stdin as NodeJS.ReadableStream & {
    isTTY?: boolean;
    isRaw?: boolean;
    setRawMode?: (mode: boolean) => void;
    resume?: () => unknown;
  };
  const wasRaw = input.isRaw === true;
  const shouldRestoreRaw =
    input.isTTY === true && typeof input.setRawMode === "function";

  const onData = (chunk: Buffer | string) => {
    pty.write(ptyInput(chunk));
  };

  stdin.on("data", onData);
  input.resume?.();

  if (shouldRestoreRaw) {
    try {
      input.setRawMode?.(true);
    } catch {
      // Some terminal hosts expose setRawMode but reject it after shutdown.
    }
  }

  return () => {
    stdin.removeListener("data", onData);
    if (shouldRestoreRaw) {
      try {
        input.setRawMode?.(wasRaw);
      } catch {
        // Best effort cleanup.
      }
    }
  };
}

function attachResizeToPty(
  stdout: NodeJS.WritableStream,
  pty: PtyProcessLike,
): () => void {
  if (typeof pty.resize !== "function") {
    return () => {};
  }

  const output = stdout as NodeJS.WritableStream & {
    on?: (event: "resize", handler: () => void) => unknown;
    off?: (event: "resize", handler: () => void) => unknown;
    removeListener?: (event: "resize", handler: () => void) => unknown;
  };
  if (typeof output.on !== "function") {
    return () => {};
  }

  const onResize = () => {
    const { cols, rows } = terminalSize(stdout);
    pty.resize?.(cols, rows);
  };
  output.on("resize", onResize);
  return () => {
    if (typeof output.off === "function") {
      output.off("resize", onResize);
      return;
    }
    output.removeListener?.("resize", onResize);
  };
}

/**
 * Spawn the target, intercept stdout through the renderer, report exactly one
 * eligible impression per wait state, and resolve with the child exit code.
 */
export async function runWrap(options: RunWrapOptions): Promise<number> {
  const {
    target,
    args,
    client = new CliApiClient(),
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
  } = options;
  const spawnImpl = options.spawnImpl ?? spawn;

  const adCache: AdCache = { current: { adAvailable: false } };
  adCache.current = await client.getAd();

  const renderer = new SpinnerRenderer({
    getAdText: () =>
      adCache.current.adAvailable ? adCache.current.adText : null,
    getAdUrl: () =>
      adCache.current.adAvailable ? adCache.current.destinationUrl : null,
  });
  const tracker = new WaitStateTracker();
  let reportTimer: TimerHandle | null = null;
  const pendingReports: Array<Promise<void>> = [];

  function clearReportTimer(): void {
    if (reportTimer !== null) {
      clearTimeout(reportTimer);
      reportTimer = null;
    }
  }

  function currentViewabilityMs(): number {
    if (!adCache.current.adAvailable) {
      return VIEWABILITY_MIN_MS;
    }
    const remaining = adCache.current.remainingViewDurationMs;
    return typeof remaining === "number" && remaining > 0
      ? Math.ceil(remaining)
      : VIEWABILITY_MIN_MS;
  }

  function applyTrackResponse(
    campaignId: string,
    response: TrackResponse | null,
  ): void {
    if (response === null || !adCache.current.adAvailable) {
      return;
    }
    if (response.recorded === false && adCache.current.campaignId === campaignId) {
      adCache.current = {
        ...adCache.current,
        accumulatedViewDurationMs: response.accumulatedViewDurationMs,
        remainingViewDurationMs: response.remainingViewDurationMs,
      };
    }
  }

  function enqueueReport(step: WaitStateStep): void {
    if (!step.impression || !adCache.current.adAvailable) {
      return;
    }
    const campaignId = adCache.current.campaignId;
    const report = Promise.resolve()
      .then(() => client.reportImpression(campaignId, step.viewDurationMs))
      .then((response) => {
        applyTrackResponse(campaignId, response);
        if (response?.recorded === true) {
          return client.getAd().then((ad) => {
            adCache.current = ad;
          });
        }
        return undefined;
      })
      .catch(() => {
        // Ad reporting must not break the wrapped command.
      });
    pendingReports.push(report);
  }

  async function flushActiveSegment(): Promise<void> {
    clearReportTimer();
    enqueueReport(tracker.finish());
    if (pendingReports.length > 0) {
      await Promise.allSettled(pendingReports);
    }
  }

  function reportIfEligible(): void {
    reportTimer = null;
    enqueueReport(tracker.qualify(Date.now(), currentViewabilityMs()));
  }

  function scheduleReport(): void {
    clearReportTimer();
    if (!adCache.current.adAvailable) {
      return;
    }
    reportTimer = setTimeout(reportIfEligible, currentViewabilityMs());
  }

  function handleOutputChunk(chunk: Buffer | string): void {
    const { output, spinner } = renderer.render(chunk);
    if (output.length > 0) {
      stdout.write(output);
    }

    if (!spinner) {
      clearReportTimer();
      enqueueReport(tracker.finish());
      return;
    }

    const wasActive = tracker.active;
    const step = tracker.observe({ spinner });

    if (spinner && !wasActive) {
      scheduleReport();
    }

    if (step.impression) {
      clearReportTimer();
      enqueueReport(step);
    }
  }

  const ptySpawnImpl: PtySpawnLike | null =
    options.ptySpawnImpl === undefined
      ? options.spawnImpl === undefined
        ? await loadPtySpawn()
        : null
      : options.ptySpawnImpl;

  if (ptySpawnImpl !== null) {
    const command = ptyCommandForPlatform(target, args);
    const { cols, rows } = terminalSize(stdout);
    const pty = ptySpawnImpl(command.file, command.args, {
      name: process.env.TERM ?? "xterm-256color",
      cols,
      rows,
      cwd: process.cwd(),
      env: process.env,
    });
    const detachStdin = attachStdinToPty(stdin, pty);
    const detachResize = attachResizeToPty(stdout, pty);

    pty.onData((data) => {
      handleOutputChunk(data);
    });

    return await new Promise<number>((resolve) => {
      pty.onExit((event) => {
        void flushActiveSegment().finally(() => {
          detachStdin();
          detachResize();
          resolve(event.exitCode ?? 0);
        });
      });
    });
  }

  const child = spawnImpl(target, args, spawnOptionsForPlatform());

  child.stderr?.on("data", (chunk: Buffer) => {
    stderr.write(chunk);
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    handleOutputChunk(chunk);
  });

  return await new Promise<number>((resolve, reject) => {
    child.on("error", (err) => {
      clearReportTimer();
      reject(err);
    });
    child.on("close", (code, signal) => {
      void flushActiveSegment().finally(() => {
        resolve(exitCodeFor(code, signal));
      });
    });
  });
}
