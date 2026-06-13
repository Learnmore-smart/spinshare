import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

import { terminateProcessTree } from "./harness";

describe("e2e harness process teardown", () => {
  it("terminates a long-running child process without hanging the test runner", async () => {
    const child = spawn(process.execPath, [
      "-e",
      "setInterval(() => {}, 1000)",
    ]);

    try {
      await terminateProcessTree(child, {
        gracefulTimeoutMs: 100,
        forceTimeoutMs: 1_000,
      });

      expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  }, 5_000);
});
