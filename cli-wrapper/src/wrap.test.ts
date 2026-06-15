import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdResponse, TrackResponse } from "@spinshare/core";

import {
  WaitStateTracker,
  countImpressions,
  exitCodeFor,
  runWrap,
  spawnOptionsForPlatform,
  type FrameClassification,
} from "./wrap.js";

describe("WaitStateTracker", () => {
  it("does not trigger before a spinner run reaches 3 seconds", () => {
    const t = new WaitStateTracker();

    expect(t.observe({ spinner: true }, 0).impression).toBe(false);
    expect(t.observe({ spinner: true }, 2999).impression).toBe(false);
    expect(t.active).toBe(true);
  });

  it("triggers exactly one impression when a contiguous spinner run reaches 3 seconds", () => {
    const t = new WaitStateTracker();

    expect(t.observe({ spinner: true }, 0).impression).toBe(false);
    expect(t.observe({ spinner: true }, 3000).impression).toBe(true);
    expect(t.observe({ spinner: true }, 5000).impression).toBe(false);
    expect(t.active).toBe(true);
  });

  it("ends the wait state on non-spinner output and re-triggers on the next eligible run", () => {
    const t = new WaitStateTracker();

    expect(t.observe({ spinner: true }, 0).impression).toBe(false);
    expect(t.observe({ spinner: true }, 3000).impression).toBe(true);
    const ended = t.observe({ spinner: false }, 3001);
    expect(ended.impression).toBe(false);
    expect(ended.inWaitState).toBe(false);
    expect(t.observe({ spinner: true }, 4000).impression).toBe(false);
    expect(t.observe({ spinner: true }, 7000).impression).toBe(true);
  });

  it("never triggers when there is no spinner output", () => {
    const frames: FrameClassification[] = [
      { spinner: false, atMs: 0 },
      { spinner: false, atMs: 1000 },
    ];
    expect(countImpressions(frames)).toBe(0);
  });

  it("counts one impression per contiguous spinner run that reaches 3 seconds", () => {
    const frames: FrameClassification[] = [
      { spinner: false, atMs: 0 },
      { spinner: true, atMs: 100 },
      { spinner: true, atMs: 3100 },
      { spinner: false, atMs: 3200 },
      { spinner: true, atMs: 4000 },
      { spinner: false, atMs: 4500 },
    ];
    expect(countImpressions(frames)).toBe(1);
  });

  it("reset clears the in-wait-state flag", () => {
    const t = new WaitStateTracker();
    t.observe({ spinner: true }, 0);
    t.reset();
    expect(t.active).toBe(false);
    expect(t.observe({ spinner: true }, 3000).impression).toBe(false);
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

describe("spawnOptionsForPlatform", () => {
  it("enables a shell on Windows so .cmd agent launchers can run", () => {
    expect(spawnOptionsForPlatform("win32").shell).toBe(true);
  });

  it("does not force a shell on POSIX platforms", () => {
    expect(spawnOptionsForPlatform("linux").shell).toBeUndefined();
    expect(spawnOptionsForPlatform("darwin").shell).toBeUndefined();
  });
});

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function fakeSpawn(child: FakeChild) {
  return (() => child) as unknown as typeof import("node:child_process").spawn;
}

function flush(): Promise<void> {
  return Promise.resolve();
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
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not report an impression when the wait state ends before 3 seconds", async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    const reported: Array<{ campaignId: string; viewDurationMs: number }> = [];
    const client = {
      getAd: async () => AD,
      reportImpression: async (campaignId: string, viewDurationMs: number) => {
        reported.push({ campaignId, viewDurationMs });
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
    await vi.advanceTimersByTimeAsync(2999);
    child.stdout.emit("data", Buffer.from("done\n"));
    child.emit("close", 0, null);

    expect(await promise).toBe(0);
    expect(reported).toEqual([]);
  });

  it("reports exactly one impression per 3-second wait state and exits with the child code", async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    const reported: Array<{ campaignId: string; viewDurationMs: number }> = [];
    const out: Buffer[] = [];
    const client = {
      getAd: async () => AD,
      reportImpression: async (campaignId: string, viewDurationMs: number) => {
        reported.push({ campaignId, viewDurationMs });
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

    await flush();
    child.stdout.emit("data", Buffer.from("starting\n"));
    child.stdout.emit("data", Buffer.from("\r|"));
    await vi.advanceTimersByTimeAsync(3000);
    child.stdout.emit("data", Buffer.from("\r/"));
    child.stdout.emit("data", Buffer.from("done\n"));
    child.stdout.emit("data", Buffer.from("\r\\"));
    await vi.advanceTimersByTimeAsync(3000);
    child.emit("close", 0, null);

    const code = await promise;
    expect(code).toBe(0);
    expect(reported).toEqual([
      { campaignId: "cmp_1", viewDurationMs: 3000 },
      { campaignId: "cmp_1", viewDurationMs: 3000 },
    ]);
    const joined = Buffer.concat(out).toString("utf8");
    expect(joined).toContain("starting\n");
    expect(joined).toContain("done\n");
    expect(joined).not.toContain("|");
  });

  it("records no impression when no ad is available (neutral fallback)", async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    let reportCalls = 0;
    const client = {
      getAd: async (): Promise<AdResponse> => ({ adAvailable: false }),
      reportImpression: async (_campaignId: string, _viewDurationMs: number) => {
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
    await vi.advanceTimersByTimeAsync(3000);
    child.emit("close", 0, null);

    expect(await promise).toBe(0);
    expect(reportCalls).toBe(0);
  });

  it("maps a signal termination to 128 + signal number", async () => {
    const child = new FakeChild();
    const promise = runWrap({
      target: "fake",
      args: [],
      client: {
        getAd: async () => AD,
        reportImpression: async () => TRACK,
      },
      stdout: { write: () => true } as unknown as NodeJS.WritableStream,
      stderr: { write: () => true } as unknown as NodeJS.WritableStream,
      spawnImpl: fakeSpawn(child),
    });
    await flush();
    child.emit("close", null, "SIGINT");
    const code = await promise;
    expect(code).toBeGreaterThanOrEqual(128);
  });
});
