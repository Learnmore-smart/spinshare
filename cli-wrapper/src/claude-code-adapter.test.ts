import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildClaudeCodeAdapterPlan,
  defaultClaudeCodeAdapterStorageRoot,
  installClaudeCodeAdapter,
  mergeClaudeCodeSettings,
  removeClaudeCodeAdapter,
  removeClaudeCodeSettings,
} from "./claude-code-adapter.js";

interface CapturedRequest {
  url: string | undefined;
  authorization: string | undefined;
  body: unknown;
}

function hookCommands(groups: Array<Record<string, unknown>> | undefined) {
  return (groups ?? []).flatMap((group) => {
    const hooks = group.hooks;
    if (!Array.isArray(hooks)) return [];
    return hooks
      .map((hook) =>
        hook && typeof hook === "object"
          ? (hook as { command?: unknown }).command
          : undefined,
      )
      .filter((command): command is string => typeof command === "string");
  });
}

async function runGeneratedScript(
  scriptPath: string,
  args: string[],
  input: unknown,
  env: NodeJS.ProcessEnv,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

async function withAdServer<T>(
  handler: (baseUrl: string, requests: CapturedRequest[]) => Promise<T>,
): Promise<T> {
  const requests: CapturedRequest[] = [];
  let adCount = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({
        url: req.url,
        authorization: req.headers.authorization,
        body: body.length > 0 ? JSON.parse(body) : null,
      });
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/ad") {
        adCount += 1;
        res.end(
          JSON.stringify({
            adAvailable: true,
            campaignId: `cmp-cli-runtime-${adCount}`,
            adText: `CLI runtime ad ${adCount}`,
            destinationUrl: "https://example.test/cli-ad",
            brandName: "CLI Runtime",
          }),
        );
        return;
      }
      res.end(JSON.stringify({ recorded: true }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("test server did not bind to a TCP port");
  }
  try {
    return await handler(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe("buildClaudeCodeAdapterPlan", () => {
  it("generates Claude settings paths, scripts, and Windows-safe commands", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app/",
      homeDir: "C:\\Users\\Noah",
      storageRoot: "C:\\Users\\Noah\\AppData\\Roaming\\spinshare\\claude-code-adapter",
    });

    expect(plan.settingsPath).toBe(
      path.join("C:\\Users\\Noah", ".claude", "settings.json"),
    );
    expect(plan.backupPath).toBe(
      path.join("C:\\Users\\Noah", ".claude", "settings.spinshare-backup.json"),
    );
    expect(plan.hookCommand).toContain('node "C:/Users/Noah/');
    expect(plan.statusLineCommand).toContain("spinshare-statusline.cjs");
  });

  it("generates hook/statusLine scripts for cumulative Claude Code ads", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app/",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare/claude-code-adapter",
    });

    const hook = plan.files.find((file) =>
      file.filePath.endsWith("spinshare-hook.cjs"),
    );
    const statusLine = plan.files.find((file) =>
      file.filePath.endsWith("spinshare-statusline.cjs"),
    );

    expect(hook?.content).toContain("if (viewDurationMs < 1) return;");
    expect(hook?.content).not.toContain("viewDurationMs < 3000");
    expect(hook?.content).toContain("const token = readToken();");
    expect(hook?.content).toContain("if (!token) return;");
    expect(hook?.content).toContain("async function fetchAd(token)");
    expect(hook?.content).toContain('authorization: "Bearer " + token');
    expect(hook?.content).toContain("credentialMatchesBaseUrl(parsed)");
    // Strict environment matching: no silent production fallback for an
    // untagged/mismatched credential (Bug B — local/prod must not mix).
    expect(hook?.content).toContain("credentialBaseUrl.length > 0 &&");
    expect(hook?.content).not.toContain(
      'return normalizeCredentialBaseUrl(baseUrl) === "https://spinshare-web-vert.vercel.app"',
    );
    expect(hook?.content).toContain("const sessionId = readSessionId();");
    expect(hook?.content).toContain("stateMatchesSession(state)");
    expect(hook?.content).toContain("expiresAtMs");
    expect(statusLine?.content).toContain("const sessionId = readSessionId();");
    expect(statusLine?.content).toContain("stateMatchesSession(state)");
    expect(statusLine?.content).toContain("function stateIsFresh(state)");
    expect(statusLine?.content).toContain('"$ " + state.adText');
    expect(statusLine?.content).toContain("function accent(text)");
  });

  it("executes generated hook/statusLine scripts with file-token auth and session gating", async () => {
    await withAdServer(async (baseUrl, requests) => {
      const tempRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "spinshare-cli-claude-adapter-"),
      );
      const configRoot = path.join(tempRoot, "config");
      await fs.mkdir(path.join(configRoot, "spinshare"), { recursive: true });
      await fs.writeFile(
        path.join(configRoot, "spinshare", "credentials.json"),
        JSON.stringify({ token: "wrong-token", baseUrl: "https://other.test" }),
        "utf8",
      );

      const plan = buildClaudeCodeAdapterPlan({
        baseUrl,
        homeDir: path.join(tempRoot, "home"),
        storageRoot: path.join(tempRoot, "adapter"),
      });
      for (const file of plan.files) {
        await fs.mkdir(path.dirname(file.filePath), { recursive: true });
        await fs.writeFile(file.filePath, file.content, "utf8");
      }
      const hookPath = plan.files.find((file) =>
        file.filePath.endsWith("spinshare-hook.cjs"),
      )?.filePath;
      const statusLinePath = plan.files.find((file) =>
        file.filePath.endsWith("spinshare-statusline.cjs"),
      )?.filePath;
      expect(hookPath).toBeDefined();
      expect(statusLinePath).toBeDefined();

      const env = {
        ...process.env,
        XDG_CONFIG_HOME: configRoot,
        APPDATA: "",
        SPINSHARE_TOKEN: "",
      };
      const ignored = await runGeneratedScript(
        hookPath!,
        ["UserPromptSubmit"],
        { session_id: "cli-session-wrong-env" },
        env,
      );
      expect(ignored).toMatchObject({ code: 0, stderr: "" });
      expect(requests).toHaveLength(0);
      await expect(fs.access(plan.stateFilePath)).rejects.toThrow();

      await fs.writeFile(
        path.join(configRoot, "spinshare", "credentials.json"),
        JSON.stringify({ token: "cli-runtime-token", baseUrl }),
        "utf8",
      );
      const start = await runGeneratedScript(
        hookPath!,
        ["UserPromptSubmit"],
        { session_id: "cli-session-a" },
        env,
      );
      expect(start).toMatchObject({ code: 0, stderr: "" });
      expect(requests[0]).toMatchObject({
        url: "/api/ad",
        authorization: "Bearer cli-runtime-token",
      });

      const state = JSON.parse(await fs.readFile(plan.stateFilePath, "utf8"));
      expect(state).toMatchObject({
        active: true,
        campaignId: "cmp-cli-runtime-1",
        adText: "CLI runtime ad 1",
        sessionId: "cli-session-a",
      });

      await fs.writeFile(
        plan.stateFilePath,
        JSON.stringify({
          ...state,
          campaignId: "cmp-cli-stale",
          adText: "CLI stale ad",
          startedAtMs: Date.now() - 60_000,
        }),
        "utf8",
      );
      const restart = await runGeneratedScript(
        hookPath!,
        ["UserPromptSubmit"],
        { session_id: "cli-session-a" },
        env,
      );
      expect(restart).toMatchObject({ code: 0, stderr: "" });
      expect(requests.filter((request) => request.url === "/api/ad")).toHaveLength(2);
      const freshState = JSON.parse(await fs.readFile(plan.stateFilePath, "utf8"));
      expect(freshState).toMatchObject({
        active: true,
        campaignId: "cmp-cli-runtime-2",
        adText: "CLI runtime ad 2",
        sessionId: "cli-session-a",
      });
      expect(freshState.startedAtMs).toBeGreaterThan(state.startedAtMs);

      const visible = await runGeneratedScript(
        statusLinePath!,
        [],
        { session_id: "cli-session-a" },
        env,
      );
      expect(visible.stdout).toContain("$ CLI runtime ad 2");
      expect(visible.stdout).toContain(
        "\u001b[1;36m$ CLI runtime ad 2\u001b[0m",
      );
      expect(visible.stdout).toContain(
        "\u001b]8;;https://example.test/cli-ad\u0007",
      );
      expect(visible.stdout).toContain("\u001b]8;;\u0007");

      const hidden = await runGeneratedScript(
        statusLinePath!,
        [],
        { session_id: "cli-session-b" },
        env,
      );
      expect(hidden.stdout).toBe("");

      await fs.writeFile(
        plan.stateFilePath,
        JSON.stringify({ ...freshState, expiresAtMs: Date.now() - 1 }),
        "utf8",
      );
      const expired = await runGeneratedScript(
        statusLinePath!,
        [],
        { session_id: "cli-session-a" },
        env,
      );
      expect(expired.stdout).toBe("");

      await fs.writeFile(
        plan.stateFilePath,
        JSON.stringify({
          ...freshState,
          startedAtMs: Date.now() - 1500,
          expiresAtMs: Date.now() + 120_000,
        }),
        "utf8",
      );
      const stop = await runGeneratedScript(
        hookPath!,
        ["Stop"],
        { session_id: "cli-session-a" },
        env,
      );
      expect(stop).toMatchObject({ code: 0, stderr: "" });
      const track = requests.find((request) => request.url === "/api/track");
      expect(track?.authorization).toBe("Bearer cli-runtime-token");
      expect(track?.body).toMatchObject({ campaignId: "cmp-cli-runtime-2" });
      expect(
        (track?.body as { viewDurationMs?: number }).viewDurationMs,
      ).toBeGreaterThan(0);
      await expect(fs.access(plan.stateFilePath)).rejects.toThrow();

      const displayAfterStop = await runGeneratedScript(
        hookPath!,
        ["MessageDisplay"],
        { session_id: "cli-session-a" },
        env,
      );
      expect(displayAfterStop).toMatchObject({ code: 0, stderr: "" });
      expect(requests.filter((request) => request.url === "/api/ad")).toHaveLength(2);
      await expect(fs.access(plan.stateFilePath)).rejects.toThrow();
    });
  });
});

describe("mergeClaudeCodeSettings", () => {
  it("preserves existing settings and appends SpinShare statusLine/hooks", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare",
    });

    const merged = mergeClaudeCodeSettings(
      {
        theme: "dark",
        env: { EXISTING_FLAG: "keep", FORCE_HYPERLINK: "0" },
        statusLine: { type: "command", command: "existing-status" },
        hooks: {
          Stop: [
            {
              hooks: [{ type: "command", command: "existing-stop" }],
            },
          ],
        },
      },
      plan,
    );

    expect(merged.theme).toBe("dark");
    expect(merged.env).toEqual({
      EXISTING_FLAG: "keep",
      FORCE_HYPERLINK: "1",
    });
    expect(merged.statusLine).toEqual({
      type: "command",
      command: plan.statusLineCommand,
      refreshInterval: 1,
    });
    expect(merged.hooks?.Stop).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({ command: "existing-stop" }),
          ]),
        }),
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({ command: `${plan.hookCommand} Stop` }),
          ]),
        }),
      ]),
    );
  });

  it("does not duplicate existing SpinShare hook handlers", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare",
    });
    const existingHandler = {
      hooks: [{ type: "command", command: `${plan.hookCommand} Stop` }],
    };

    const merged = mergeClaudeCodeSettings(
      { hooks: { Stop: [existingHandler] } },
      plan,
    );

    expect(merged.hooks?.Stop).toEqual([existingHandler]);
  });

  it("replaces SpinShare hooks from another installer path", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare-cli",
    });
    const oldHookCommand =
      'node "/tmp/spinshare-extension/spinshare-hook.cjs" Stop';
    const existingStop = {
      hooks: [{ type: "command", command: "existing-stop" }],
    };

    const merged = mergeClaudeCodeSettings(
      {
        statusLine: {
          type: "command",
          command: 'node "/tmp/spinshare-extension/spinshare-statusline.cjs"',
          refreshInterval: 1,
        },
        hooks: {
          Stop: [
            { hooks: [{ type: "command", command: oldHookCommand }] },
            existingStop,
          ],
        },
      },
      plan,
    );

    expect(merged.statusLine).toEqual({
      type: "command",
      command: plan.statusLineCommand,
      refreshInterval: 1,
    });
    expect(merged.hooks?.Stop).toEqual(
      expect.arrayContaining([
        existingStop,
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({ command: `${plan.hookCommand} Stop` }),
          ]),
        }),
      ]),
    );
    expect(hookCommands(merged.hooks?.Stop)).not.toContain(oldHookCommand);
  });
});

describe("removeClaudeCodeSettings", () => {
  it("removes only SpinShare statusLine/hooks and preserves user settings", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare",
    });
    const existingStop = {
      hooks: [{ type: "command", command: "existing-stop" }],
    };

    const cleaned = removeClaudeCodeSettings(
      {
        theme: "dark",
        statusLine: {
          type: "command",
          command: plan.statusLineCommand,
          refreshInterval: 1,
        },
        hooks: {
          Stop: [
            existingStop,
            {
              hooks: [
                { type: "command", command: `${plan.hookCommand} Stop` },
                { type: "command", command: "existing-mixed-stop" },
              ],
            },
          ],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: "command",
                  command: `${plan.hookCommand} UserPromptSubmit`,
                },
              ],
            },
          ],
        },
      },
      plan,
    );

    expect(cleaned.theme).toBe("dark");
    expect(cleaned.statusLine).toBeUndefined();
    expect(cleaned.hooks?.Stop).toEqual([
      existingStop,
      { hooks: [{ type: "command", command: "existing-mixed-stop" }] },
    ]);
    expect(cleaned.hooks?.UserPromptSubmit).toBeUndefined();
  });

  it("removes SpinShare hooks from another installer path", () => {
    const plan = buildClaudeCodeAdapterPlan({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir: "/home/noah",
      storageRoot: "/tmp/spinshare-cli",
    });
    const existingStop = {
      hooks: [{ type: "command", command: "existing-stop" }],
    };

    const cleaned = removeClaudeCodeSettings(
      {
        theme: "dark",
        statusLine: {
          type: "command",
          command: 'node "/tmp/spinshare-extension/spinshare-statusline.cjs"',
          refreshInterval: 1,
        },
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command:
                    'node "/tmp/spinshare-extension/spinshare-hook.cjs" Stop',
                },
              ],
            },
            existingStop,
          ],
        },
      },
      plan,
    );

    expect(cleaned.theme).toBe("dark");
    expect(cleaned.statusLine).toBeUndefined();
    expect(cleaned.hooks?.Stop).toEqual([existingStop]);
  });
});

describe("removeClaudeCodeAdapter", () => {
  it("removes installed settings entries and generated adapter files", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "spinshare-cli-claude-remove-"),
    );
    const homeDir = path.join(tempRoot, "home");
    const storageRoot = path.join(tempRoot, "adapter");
    await fs.mkdir(path.join(homeDir, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(homeDir, ".claude", "settings.json"),
      Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(
          JSON.stringify({
            theme: "dark",
            hooks: {
              Stop: [
                { hooks: [{ type: "command", command: "existing-stop" }] },
              ],
            },
          }),
        ),
      ]),
    );

    const installPlan = await installClaudeCodeAdapter({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir,
      storageRoot,
    });
    expect(installPlan).not.toBeNull();
    await fs.writeFile(installPlan!.stateFilePath, "{}", "utf8");

    const removed = await removeClaudeCodeAdapter({
      baseUrl: "https://spinshare-web-vert.vercel.app",
      homeDir,
      storageRoot,
    });
    const cleaned = JSON.parse(await fs.readFile(removed.settingsPath, "utf8"));

    expect(cleaned.statusLine).toBeUndefined();
    expect(cleaned.theme).toBe("dark");
    expect(cleaned.hooks.Stop).toEqual([
      { hooks: [{ type: "command", command: "existing-stop" }] },
    ]);
    expect(cleaned.hooks.UserPromptSubmit).toBeUndefined();
    await expect(fs.access(removed.scriptDir)).rejects.toThrow();
  });
});

describe("defaultClaudeCodeAdapterStorageRoot", () => {
  it("uses APPDATA on Windows-like environments", () => {
    expect(
      defaultClaudeCodeAdapterStorageRoot({
        APPDATA: "C:\\Users\\Noah\\AppData\\Roaming",
      }),
    ).toBe(
      path.join(
        "C:\\Users\\Noah\\AppData\\Roaming",
        "spinshare",
        "claude-code-adapter",
      ),
    );
  });
});
