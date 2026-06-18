import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { isDirectExecution, parseArgs, runDirectExecution } from "./index";

describe("parseArgs", () => {
  it("routes Claude Code setup", () => {
    expect(parseArgs(["setup", "claude-code"])).toEqual({
      kind: "setupClaudeCode",
    });
  });

  it("routes Claude Code adapter removal", () => {
    expect(parseArgs(["setup", "claude-code", "--remove"])).toEqual({
      kind: "removeClaudeCode",
    });
  });
});

describe("isDirectExecution", () => {
  it("matches normalized Windows paths and file URLs", () => {
    const scriptPath = resolve(
      "D:/Noah/文档/Coding/ai-ide-ads/cli-wrapper/dist/index.js",
    );

    expect(isDirectExecution(pathToFileURL(scriptPath).href, scriptPath)).toBe(
      true,
    );
  });

  it("does not match imports or missing entrypoint paths", () => {
    const scriptPath = resolve("cli-wrapper/dist/index.js");
    const otherPath = resolve("cli-wrapper/dist/other.js");

    expect(isDirectExecution(pathToFileURL(scriptPath).href, otherPath)).toBe(
      false,
    );
    expect(isDirectExecution(pathToFileURL(scriptPath).href, undefined)).toBe(
      false,
    );
  });
});

describe("runDirectExecution", () => {
  it("exits with the resolved main exit code", async () => {
    const exits: number[] = [];

    await runDirectExecution(
      ["fake"],
      async () => 7,
      (code) => {
        exits.push(code);
      },
      () => {},
    );

    expect(exits).toEqual([7]);
  });

  it("exits with 1 and writes a safe error when main rejects", async () => {
    const exits: number[] = [];
    const errors: string[] = [];

    await runDirectExecution(
      ["fake"],
      async () => {
        throw new Error("network down");
      },
      (code) => {
        exits.push(code);
      },
      (message) => {
        errors.push(message);
      },
    );

    expect(exits).toEqual([1]);
    expect(errors).toEqual(["spinshare: network down\n"]);
  });
});
