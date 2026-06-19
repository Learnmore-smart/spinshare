import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  ClaudeCodeStateBridge,
  readClaudeCodeAdState,
} from "./claude-code-state-bridge";

function makeVscode() {
  let openCommand: (() => void) | undefined;
  const commandDisposable = { dispose: vi.fn() };
  const statusBarItem = {
    text: "",
    tooltip: undefined as string | undefined,
    command: undefined as string | undefined,
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
  const withProgress = vi.fn();
  const showInformationMessage = vi.fn();
  const createStatusBarItem = vi.fn(() => statusBarItem);
  const registerCommand = vi.fn((command: string, callback: () => void) => {
    if (command === "spinshare.openClaudeCodeAd") {
      openCommand = callback;
    }
    return commandDisposable;
  });

  return {
    commandDisposable,
    openCommand: () => openCommand?.(),
    statusBarItem,
    vscode: {
      window: {
        withProgress,
        showInformationMessage,
        createStatusBarItem,
      },
      commands: { registerCommand },
      ProgressLocation: { Notification: 15 },
      StatusBarAlignment: { Right: 2 },
    },
  };
}

async function makeStateFile(): Promise<string> {
  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "spinshare-vscode-state-bridge-"),
  );
  return path.join(tempRoot, "state.json");
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("readClaudeCodeAdState", () => {
  it("returns null for expired or malformed state", () => {
    expect(readClaudeCodeAdState("{", Date.now())).toBeNull();
    expect(
      readClaudeCodeAdState(
        JSON.stringify({
          active: true,
          campaignId: "cmp-expired",
          adText: "Expired ad",
          expiresAtMs: Date.now() - 1,
        }),
        Date.now(),
      ),
    ).toBeNull();
    expect(
      readClaudeCodeAdState(
        JSON.stringify({
          active: true,
          campaignId: "cmp-stale",
          adText: "Stale active ad",
          startedAtMs: 1_000,
          expiresAtMs: 200_000,
        }),
        10_001,
      ),
    ).toBeNull();
  });
});

describe("ClaudeCodeStateBridge", () => {
  it("shows one compact status bar item for fresh hook state and hides it when state disappears", async () => {
    const stateFilePath = await makeStateFile();
    const { openCommand, statusBarItem, vscode } = makeVscode();
    const openUrl = vi.fn();
    const bridge = new ClaudeCodeStateBridge({
      vscode,
      stateFilePath,
      openUrl,
    });

    await fs.writeFile(
      stateFilePath,
      JSON.stringify({
        active: true,
        campaignId: "cmp-1",
        adText: "Try SpinShare while Claude thinks",
        destinationUrl: "https://example.test/ad",
        brandName: "SpinShare",
        startedAtMs: Date.now(),
        expiresAtMs: Date.now() + 120_000,
      }),
      "utf8",
    );

    await bridge.refreshFromDisk();
    await bridge.refreshFromDisk();

    expect(vscode.window.createStatusBarItem).toHaveBeenCalledOnce();
    expect(vscode.window.withProgress).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(statusBarItem.text).toBe(
      "$(link-external) SpinShare: Try SpinShare while Claude thinks",
    );
    expect(statusBarItem.command).toBe("spinshare.openClaudeCodeAd");
    expect(statusBarItem.show).toHaveBeenCalledOnce();

    openCommand();
    expect(openUrl).toHaveBeenCalledWith("https://example.test/ad");

    await fs.rm(stateFilePath);
    await bridge.refreshFromDisk();
    await flushPromises();

    expect(statusBarItem.hide).toHaveBeenCalledOnce();
    expect(statusBarItem.command).toBeUndefined();
  });

  it("updates the existing status bar item when the active hook state changes", async () => {
    const stateFilePath = await makeStateFile();
    const { commandDisposable, statusBarItem, vscode } = makeVscode();
    const bridge = new ClaudeCodeStateBridge({ vscode, stateFilePath });
    const startedAtMs = Date.now();

    await fs.writeFile(
      stateFilePath,
      JSON.stringify({
        active: true,
        campaignId: "cmp-1",
        adText: "First ad",
        startedAtMs,
        expiresAtMs: Date.now() + 120_000,
      }),
      "utf8",
    );
    await bridge.refreshFromDisk();

    await fs.writeFile(
      stateFilePath,
      JSON.stringify({
        active: true,
        campaignId: "cmp-2",
        adText: "Second ad",
        startedAtMs: startedAtMs + 1,
        expiresAtMs: Date.now() + 120_000,
      }),
      "utf8",
    );
    await bridge.refreshFromDisk();
    await flushPromises();

    expect(vscode.window.createStatusBarItem).toHaveBeenCalledOnce();
    expect(statusBarItem.show).toHaveBeenCalledTimes(2);
    expect(statusBarItem.text).toBe("$(info) SpinShare: Second ad");

    bridge.dispose();
    await flushPromises();
    expect(statusBarItem.hide).toHaveBeenCalledOnce();
    expect(statusBarItem.dispose).toHaveBeenCalledOnce();
    expect(commandDisposable.dispose).toHaveBeenCalledOnce();
  });
});
