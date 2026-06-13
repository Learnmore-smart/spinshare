import { describe, expect, it } from "vitest";
import {
  WaitStateTracker,
  countImpressions,
  exitCodeFor,
  runWrap,
  type FrameClassification,
} from "./wrap.js";
import type { AdResponse, TrackResponse } from "@spinshare/core";

describe("WaitStateTracker", () => {
  it("triggers exactly one impression at the start of a contiguous spinner run", () => {
    const t = new WaitStateTracker();
    expect(t.observe({ spinner: true }).impression).toBe(true);
    expect(t.observe({ spinner: true }).impression).toBe(false);
    expect(t.observe({ spinner: true }).impression).toBe(false);
    expect(t.active).toBe(true);
  });

  it("ends the wait state on non-spinner output and re-triggers on the next run", () => {
    const t = new WaitStateTracker();
    expect(t.observe({ spinner: true }).impression).toBe(true);
    const ended = t.observe({ spinner: false });
    expect(ended.impression).toBe(false);
    expect(ended.inWaitState).toBe(false);
    // A new spinner run is a new impression.
    expect(t.observe({ spinner: true }).impression).toBe(true);
  });

  it("never triggers when there is no spinner output", () => {
    const frames: FrameClassification[] = [
      { spinner: false },
      { spinner: false },
    ];
    expect(countImpressions(frames)).toBe(0);
  });

  it("counts one impression per contiguous spinner run", () => {
    const frames: FrameClassification[] = [
      { spinner: false },
      { spinner: true },
      { spinner: true }, // same run
      { spinner: false },
      { spinner: true }, // new run
      { spinner: false },
    ];
    expect(countImpressions(frames)).toBe(2);
  });

  it("reset clears the in-wait-state flag", () => {
    const t = new WaitStateTracker();
    t.observe({ spinner: true });
    t.reset();
    expect(t.active).toBe(false);
    expect(t.observe({ spinner: true }).impression).toBe(true);
  });
});

describe("exitCodeFor", () => {
  it("passes through a normal numeric exit code", () => {
    expect(exitCodeFor(0, null)).toBe(0);
    expect(exitCodeFor(1, null)).toBe(1);
    expect(exitCodeFor(42, null)).toBe(42);
  });

  it("treats a null code with no signal as 0", () => {
    expect(exitCodeFor(null, null)).toBe(0);
  });

  it("maps signal termination to 128 + signal number", () => {
    const signals = { SIGINT: 2, SIGTERM: 15, SIGKILL: 9 };
    expect(exitCodeFor(null, "SIGINT", signals)).toBe(130);
    expect(exitCodeFor(null, "SIGTERM", signals)).toBe(143);
    expect(exitCodeFor(null, "SIGKILL", signals)).toBe(137);
  });

  it("falls back to 128 for an unknown signal name", () => {
    expect(exitCodeFor(null, "SIGNOPE", {})).toBe(128);
  });

  it("prefers the signal over a present code", () => {
    expect(exitCodeFor(0, "SIGINT", { SIGINT: 2 })).toBe(130);
  });
});

// ---------------------------------------------------------------------------
// Thin integration of runWrap around a fake child process + fake client.
// ---------------------------------------------------------------------------

import { EventEmitter } from "node:events";

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function fakeSpawn(child: FakeChild) {
  return (() => child) as unknown as typeof import("node:child_process").spawn;
}

/** Flush microtasks + one macrotask so runWrap's ad prefetch + listener wiring completes. */
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

const AD: AdResponse = {
  adAvailable: true,
  campaignId: "cmp_1",
  adText: "Buy SpinShare Pro",
  cpmCents: 3000,
  cpmUsd: "30.00",
};

const TRACK: TrackResponse = {
  recorded: true,
  developerCreditCents: 18,
  developerCreditUsd: "0.18",
};

describe("runWrap", () => {
  it("reports exactly one impression per wait state and exits with the child code", async () => {
    const child = new FakeChild();
    const reported: string[] = [];
    const out: Buffer[] = [];
    const client = {
      getAd: async () => AD,
      reportImpression: async (campaignId: string) => {
        reported.push(campaignId);
        return TRACK;
      },
    };
    const stdout = {
      write: (b: Buffer) => {
        out.push(Buffer.from(b));
        return true;
      },
    } as unknown as NodeJS.WritableStream;

    const promise = runWrap({
      target: "fake",
      args: [],
      client,
      stdout,
      stderr: { write: () => true } as unknown as NodeJS.WritableStream,
      spawnImpl: fakeSpawn(child),
    });

    // One wait state: several spinner frames, then real output, then a new run.
    await flush();
    child.stdout.emit("data", Buffer.from("starting\n"));
    child.stdout.emit("data", Buffer.from("\r|"));
    child.stdout.emit("data", Buffer.from("\r/"));
    child.stdout.emit("data", Buffer.from("\r-"));
    child.stdout.emit("data", Buffer.from("done\n"));
    child.stdout.emit("data", Buffer.from("\r\\")); // second wait state
    child.emit("close", 0, null);

    const code = await promise;
    expect(code).toBe(0);
    // Two contiguous spinner runs → two impressions.
    expect(reported).toEqual(["cmp_1", "cmp_1"]);
    // Real text is forwarded, spinner glyphs suppressed.
    const joined = Buffer.concat(out).toString("utf8");
    expect(joined).toContain("starting\n");
    expect(joined).toContain("done\n");
    expect(joined).not.toContain("|");
  });

  it("records no impression when no ad is available (neutral fallback)", async () => {
    const child = new FakeChild();
    let reportCalls = 0;
    const client = {
      getAd: async (): Promise<AdResponse> => ({ adAvailable: false }),
      reportImpression: async () => {
        reportCalls += 1;
        return TRACK;
      },
    };

    const promise = runWrap({
      target: "fake",
      args: [],
      client,
      stdout: { write: () => true } as unknown as NodeJS.WritableStream,
      stderr: { write: () => true } as unknown as NodeJS.WritableStream,
      spawnImpl: fakeSpawn(child),
    });

    await flush();
    child.stdout.emit("data", Buffer.from("\r|"));
    child.stdout.emit("data", Buffer.from("\r/"));
    child.emit("close", 0, null);

    expect(await promise).toBe(0);
    expect(reportCalls).toBe(0);
  });

  it("maps a signal termination to 128 + signal number", async () => {
    const child = new FakeChild();
    const promise = runWrap({
      target: "fake",
      args: [],
      client: { getAd: async () => AD, reportImpression: async () => TRACK },
      stdout: { write: () => true } as unknown as NodeJS.WritableStream,
      stderr: { write: () => true } as unknown as NodeJS.WritableStream,
      spawnImpl: fakeSpawn(child),
    });
    await flush();
    child.emit("close", null, "SIGINT");
    const code = await promise;
    // 128 + os signal number for SIGINT (2 on POSIX) — assert it's signal-mapped.
    expect(code).toBeGreaterThanOrEqual(128);
  });
});
