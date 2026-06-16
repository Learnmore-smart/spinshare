import * as path from "node:path";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  applyTerminalAutoWrapEnvironment,
  buildTerminalAutoWrapPlan,
  normalizeTerminalAgents,
} from "./terminal-auto-wrap";

describe("normalizeTerminalAgents", () => {
  it("deduplicates safe command names and drops unsafe entries", () => {
    expect(
      normalizeTerminalAgents([
        " claude ",
        "claude",
        "codex",
        "bad/name",
        "",
        "aider.chat",
        "../escape",
      ]),
    ).toEqual(["claude", "codex", "aider.chat"]);
  });

  it("falls back to claude when no configured agent is valid", () => {
    expect(normalizeTerminalAgents(["", "../escape"])).toEqual(["claude"]);
  });
});

describe("buildTerminalAutoWrapPlan", () => {
  it("generates shims and a launcher that removes the shim dir before spawning", () => {
    const plan = buildTerminalAutoWrapPlan({
      baseUrl: "http://localhost:3000/",
      extensionRoot: "D:\\repo\\vscode-extension",
      pathDelimiter: ";",
      storageRoot: "C:\\spinshare-storage",
    });

    expect(plan.shimDir).toBe(
      path.join("C:\\spinshare-storage", "terminal-shims"),
    );
    expect(plan.pathPrepend).toBe(`${plan.shimDir};`);

    const filesByName = new Map(
      plan.files.map((file) => [path.basename(file.filePath), file]),
    );
    expect(filesByName.has("spinshare-terminal-launcher.cjs")).toBe(true);
    expect(filesByName.has("claude.cmd")).toBe(true);
    expect(filesByName.has("claude.ps1")).toBe(true);
    expect(filesByName.has("claude")).toBe(true);

    const launcher = filesByName.get("spinshare-terminal-launcher.cjs")?.content;
    expect(launcher).toContain("const shimDir = __dirname;");
    expect(launcher).toContain("normalizePath(entry) !== normalizedShimDir");
    expect(launcher).toContain("SPINSHARE_BASE_URL");
    expect(launcher).toContain("SPINSHARE_API_URL");
    expect(launcher).toContain("cli-wrapper");
    expect(launcher).toContain("dist");
    expect(launcher).toContain("index.js");
  });

  it("prefers the CLI bundled inside the installed extension", () => {
    const plan = buildTerminalAutoWrapPlan({
      baseUrl: "https://spinshare.dev",
      extensionRoot: "/installed/spinshare",
      storageRoot: "/tmp/spinshare",
    });
    const launcher = plan.files.find(
      (file) => path.basename(file.filePath) === "spinshare-terminal-launcher.cjs",
    )?.content;

    expect(launcher).toBeDefined();
    const bundled = 'path.resolve(extensionRoot, "cli-wrapper", "dist", "index.js")';
    const repoLocal = 'path.resolve(extensionRoot, "..", "cli-wrapper", "dist", "index.js")';

    expect(launcher).toContain("process.env.SPINSHARE_CLI_PATH");
    expect(launcher).toContain(bundled);
    expect(launcher).toContain(repoLocal);
    expect(launcher!.indexOf(bundled)).toBeLessThan(
      launcher!.indexOf(repoLocal),
    );
  });

  it("direct-launches Claude Code while preserving wrapper fallback for other agents", () => {
    const plan = buildTerminalAutoWrapPlan({
      agents: ["claude", "codex"],
      baseUrl: "https://www.spinshare.dev",
      extensionRoot: "/installed/spinshare",
      storageRoot: "/tmp/spinshare",
    });
    const launcher = plan.files.find(
      (file) => path.basename(file.filePath) === "spinshare-terminal-launcher.cjs",
    )?.content;

    expect(launcher).toBeDefined();
    expect(launcher).toContain('const nativeAdapterAgents = new Set(["claude"])');
    expect(launcher).toContain("if (nativeAdapterAgents.has(agent))");
    expect(launcher).toContain("spawnSync(agent, args");
    expect(launcher).toContain("[...commandArgs, agent, ...args]");
  });

  it("uses the configured agent list for shim filenames", () => {
    const plan = buildTerminalAutoWrapPlan({
      agents: ["claude", "codex"],
      baseUrl: "https://spinshare.dev",
      extensionRoot: "/repo/vscode-extension",
      storageRoot: "/tmp/spinshare",
    });

    const basenames = plan.files.map((file) => path.basename(file.filePath));
    expect(basenames).toEqual(
      expect.arrayContaining([
        "claude.cmd",
        "claude.ps1",
        "claude",
        "codex.cmd",
        "codex.ps1",
        "codex",
      ]),
    );
  });
});

describe("bundle-cli script", () => {
  it("writes a nested package manifest that marks the bundled CLI as ESM", () => {
    const script = readFileSync(
      path.join(process.cwd(), "scripts", "bundle-cli.mjs"),
      "utf8",
    );

    expect(script).toContain('join(extensionRoot, "cli-wrapper", "package.json")');
    expect(script).toContain('"type": "module"');
  });

  it("copies the PTY native runtime into the bundled CLI node_modules", () => {
    const script = readFileSync(
      path.join(process.cwd(), "scripts", "bundle-cli.mjs"),
      "utf8",
    );

    expect(script).toContain("@homebridge");
    expect(script).toContain("node-pty-prebuilt-multiarch");
    expect(script).toContain("realpath");
    expect(script).toContain('join(extensionRoot, "cli-wrapper", "node_modules")');
  });
});

describe("applyTerminalAutoWrapEnvironment", () => {
  it("clears previous mutations and prepends the shim dir to terminal PATH", () => {
    const calls: Array<[string, string?, string?]> = [];
    const collection = {
      clear: () => calls.push(["clear"]),
      prepend: (name: string, value: string) =>
        calls.push(["prepend", name, value]),
    };

    applyTerminalAutoWrapEnvironment(
      {
        files: [],
        pathPrepend: "C:\\spinshare-storage\\terminal-shims;",
        shimDir: "C:\\spinshare-storage\\terminal-shims",
      },
      collection,
    );

    expect(calls).toEqual([
      ["clear"],
      ["prepend", "PATH", "C:\\spinshare-storage\\terminal-shims;"],
    ]);
  });
});
