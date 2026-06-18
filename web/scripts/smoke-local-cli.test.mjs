import { describe, expect, it } from "vitest";

import {
  CLI_SMOKE_TIMEOUT_MS,
  cliSmokeCommand,
  isLocalCliAdOutput,
} from "./smoke-local-cli.mjs";

describe("local CLI smoke helpers", () => {
  it("accepts captured output containing the local sample ad", () => {
    expect(
      isLocalCliAdOutput(
        "\rSpinShare Local - sample ad for localhost testing\u001b[K\n",
      ),
    ).toBe(true);
  });

  it("rejects output without the local sample ad", () => {
    expect(isLocalCliAdOutput("|\r/\r-\r\\\n")).toBe(false);
    expect(isLocalCliAdOutput("LearnX production-looking ad\n")).toBe(false);
  });

  it("builds the fake AI wrapper command", () => {
    expect(cliSmokeCommand("node.exe")).toEqual({
      command: "node.exe",
      args: [
        "cli-wrapper/dist/index.js",
        "node",
        "cli-wrapper/fake-ai.js",
      ],
    });
  });

  it("bounds the CLI child command runtime", () => {
    expect(CLI_SMOKE_TIMEOUT_MS).toBeGreaterThanOrEqual(8_000);
    expect(CLI_SMOKE_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
