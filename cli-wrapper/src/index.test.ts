import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { isDirectExecution, parseArgs } from "./index";

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
