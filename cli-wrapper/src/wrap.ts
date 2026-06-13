/**
 * @spinshare/cli — child-process wrapper with impression reporting (task 13.4).
 *
 * Responsibilities (design "CLI Wrapper" + Requirements 5.1, 5.2, 5.5, 5.6, 5.7):
 *   - Spawn the target command as a child process (`child_process.spawn`) with
 *     stdin **inherited** so the developer's input flows straight through.
 *   - Pipe the child's stdout through the pure {@link SpinnerRenderer} and write
 *     the rendered bytes to the real stdout; pass stderr through unmodified.
 *   - Detect wait-state start/end from the per-frame spinner classification and
 *     send EXACTLY ONE `POST /api/track` per wait state (debounced across the
 *     many spinner frames that occur within one contiguous wait state).
 *   - Use a prefetched/cached ad from `GET /api/ad`; when no ad is available show
 *     a neutral fallback (the renderer simply suppresses the spinner) and record
 *     NO impression.
 *   - Exit with the child's exit code; if the child is killed by a signal, exit
 *     `128 + signal` number.
 *
 * The wait-state/impression logic and the exit-code mapping are extracted as
 * PURE, injectable units ({@link WaitStateTracker}, {@link exitCodeFor}) so the
 * property tests in tasks 13.5 ("exactly one impression per wait state") and
 * 13.6 ("exit-code passthrough") can drive them with no real processes. The
 * spawning code is kept as a thin shell around these units.
 */

import { spawn } from "node:child_process";
import * as os from "node:os";
import { SpinnerRenderer } from "./renderer.js";
import { CliApiClient } from "./api-client.js";
import type { AdResponse } from "@spinshare/core";

// ---------------------------------------------------------------------------
// Pure unit 1: wait-state tracking / impression debounce
// ---------------------------------------------------------------------------

/** Classification of a single output frame, as produced by {@link SpinnerRenderer}. */
export interface FrameClassification {
  /** True when the frame was a spinner-only (wait-state) frame. */
  spinner: boolean;
}

/** Result of feeding one frame to a {@link WaitStateTracker}. */
export interface WaitStateStep {
  /**
   * True on exactly the frame that STARTS a new wait state — the single frame on
   * which one impression should be reported for this contiguous spinner run.
   */
  impression: boolean;
  /** True while the tracker is currently inside a wait state. */
  inWaitState: boolean;
}

/**
 * Pure state machine that maps a sequence of frame classifications to
 * impression-trigger events, emitting `impression: true` exactly once per
 * contiguous run of spinner frames.
 *
 * A wait state begins at the first spinner frame and ends as soon as a
 * non-spinner frame resumes. Multiple spinner frames inside one wait state
 * trigger a single impression (debounced).
 *
 * Holds no I/O; deterministic for a fixed input sequence — directly drivable by
 * the Property 22 test (task 13.5).
 */
export class WaitStateTracker {
  private inWaitState = false;

  /** Feed one frame; returns whether it starts a wait state and the new state. */
  observe(frame: FrameClassification): WaitStateStep {
    if (frame.spinner) {
      const impression = !this.inWaitState; // first spinner frame of the run
      this.inWaitState = true;
      return { impression, inWaitState: true };
    }
    // Non-spinner output ends any active wait state.
    this.inWaitState = false;
    return { impression: false, inWaitState: false };
  }

  /** True while inside a contiguous spinner run. */
  get active(): boolean {
    return this.inWaitState;
  }

  /** Reset to the initial (no wait state) state. */
  reset(): void {
    this.inWaitState = false;
  }
}

/**
 * Convenience pure helper: count how many impressions a frame sequence would
 * trigger. Equal to the number of contiguous spinner runs. Useful for the
 * Property 22 test.
 */
export function countImpressions(frames: ReadonlyArray<FrameClassification>): number {
  const tracker = new WaitStateTracker();
  let count = 0;
  for (const frame of frames) {
    if (tracker.observe(frame).impression) {
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Pure unit 2: exit-code mapping
// ---------------------------------------------------------------------------

/**
 * Map a child process's `(code, signal)` termination outcome to the exit code
 * the wrapper should exit with.
 *
 * - Normal exit: pass through the child's numeric exit code (`code ?? 0`).
 * - Signal termination: `128 + <signal number>` (POSIX convention), looked up
 *   from `signalNumbers` (defaults to `os.constants.signals`). Unknown signal
 *   names fall back to `128`.
 *
 * Pure and injectable — the Property 23 test (task 13.6) drives it directly.
 */
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

/** Options for {@link runWrap}, all injectable for testability. */
export interface RunWrapOptions {
  /** Target command to spawn. */
  target: string;
  /** Arguments forwarded to the target command. */
  args: string[];
  /** API client; defaults to a {@link CliApiClient} reading env config. */
  client?: Pick<CliApiClient, "getAd" | "reportImpression">;
  /** Real stdout sink; defaults to `process.stdout`. */
  stdout?: NodeJS.WritableStream;
  /** Real stderr sink; defaults to `process.stderr`. */
  stderr?: NodeJS.WritableStream;
  /**
   * Spawner; defaults to `child_process.spawn`. Injectable so unit tests can
   * substitute a fake child without launching a real process.
   */
  spawnImpl?: typeof spawn;
}

/** Holds the currently cached ad and exposes the renderer's ad-text getter. */
interface AdCache {
  current: AdResponse;
}

/**
 * Spawn the target, intercept its stdout through the renderer, report exactly
 * one impression per wait state (only when an ad is available), and resolve with
 * the exit code the wrapper should use.
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

  // Prefetch an ad once up front; refreshed on each wait-state start below.
  const adCache: AdCache = { current: { adAvailable: false } };
  adCache.current = await client.getAd();

  const renderer = new SpinnerRenderer({
    getAdText: () =>
      adCache.current.adAvailable ? adCache.current.adText : null,
  });
  const tracker = new WaitStateTracker();

  const child = spawnImpl(target, args, {
    stdio: ["inherit", "pipe", "pipe"],
  });

  // Forward stderr unmodified.
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr.write(chunk);
  });

  // Pipe stdout through the renderer; debounce one impression per wait state.
  child.stdout?.on("data", (chunk: Buffer) => {
    const { output, spinner } = renderer.render(chunk);
    if (output.length > 0) {
      stdout.write(output);
    }
    const step = tracker.observe({ spinner });
    if (step.impression && adCache.current.adAvailable) {
      // Exactly one POST /api/track per wait state. Fire-and-forget so we never
      // block the output stream; failures degrade silently (no credit).
      void client.reportImpression(adCache.current.campaignId);
    }
  });

  return await new Promise<number>((resolve, reject) => {
    child.on("error", (err) => {
      reject(err);
    });
    // `close` fires after stdio streams have flushed (vs. `exit`).
    child.on("close", (code, signal) => {
      resolve(exitCodeFor(code, signal));
    });
  });
}
