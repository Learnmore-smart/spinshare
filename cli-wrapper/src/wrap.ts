/**
 * @spinshare/cli child-process wrapper with impression reporting.
 *
 * The wrapper intercepts spinner-only stdout frames, shows a cached ad through
 * the renderer, and reports one impression only after a contiguous wait state
 * has stayed active for the 3-second viewability minimum.
 */

import { spawn } from "node:child_process";
import * as os from "node:os";

import type { AdResponse } from "@spinshare/core";

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
  qualify(nowMs = Date.now()): WaitStateStep {
    if (!this.inWaitState) {
      return { impression: false, inWaitState: false, viewDurationMs: 0 };
    }

    const viewDurationMs = Math.max(0, nowMs - this.waitStartedAtMs);
    const impression = !this.reported && viewDurationMs >= this.minViewMs;
    if (impression) {
      this.reported = true;
    }

    return { impression, inWaitState: true, viewDurationMs };
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
  /** Real stdout sink; defaults to process.stdout. */
  stdout?: NodeJS.WritableStream;
  /** Real stderr sink; defaults to process.stderr. */
  stderr?: NodeJS.WritableStream;
  /** Spawner for tests. */
  spawnImpl?: typeof spawn;
}

interface AdCache {
  current: AdResponse;
}

type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Spawn the target, intercept stdout through the renderer, report exactly one
 * eligible impression per wait state, and resolve with the child exit code.
 */
export async function runWrap(options: RunWrapOptions): Promise<number> {
  const {
    target,
    args,
    client = new CliApiClient(),
    stdout = process.stdout,
    stderr = process.stderr,
    spawnImpl = spawn,
  } = options;

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

  function clearReportTimer(): void {
    if (reportTimer !== null) {
      clearTimeout(reportTimer);
      reportTimer = null;
    }
  }

  function reportIfEligible(): void {
    reportTimer = null;
    const step = tracker.qualify();
    if (step.impression && adCache.current.adAvailable) {
      void client.reportImpression(
        adCache.current.campaignId,
        step.viewDurationMs,
      );
    }
  }

  function scheduleReport(): void {
    clearReportTimer();
    if (!adCache.current.adAvailable) {
      return;
    }
    reportTimer = setTimeout(reportIfEligible, VIEWABILITY_MIN_MS);
  }

  const child = spawnImpl(target, args, {
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    stderr.write(chunk);
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    const { output, spinner } = renderer.render(chunk);
    if (output.length > 0) {
      stdout.write(output);
    }

    const wasActive = tracker.active;
    const step = tracker.observe({ spinner });

    if (spinner && !wasActive) {
      scheduleReport();
    }

    if (!spinner) {
      clearReportTimer();
      return;
    }

    if (step.impression && adCache.current.adAvailable) {
      clearReportTimer();
      void client.reportImpression(
        adCache.current.campaignId,
        step.viewDurationMs,
      );
    }
  });

  return await new Promise<number>((resolve, reject) => {
    child.on("error", (err) => {
      clearReportTimer();
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearReportTimer();
      resolve(exitCodeFor(code, signal));
    });
  });
}
