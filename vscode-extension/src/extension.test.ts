import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const statusBarItem = {
    text: "",
    tooltip: "",
    command: "",
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
  const subscriptions: Array<{ dispose(): void }> = [];
  const configurationWatchers: Array<(event: {
    affectsConfiguration(setting: string): boolean;
  }) => void> = [];
  const configurationValues: Record<string, unknown> = {};
  const bridgeInstances: Array<{
    options: Record<string, unknown>;
    start: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }> = [];
  const authInstances: Array<{
    initialize: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    ensureAuthenticated: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
    deps: Record<string, unknown>;
  }> = [];

  class MockAuthManager {
    initialize = vi.fn(async () => undefined);
    isAuthenticated = vi.fn(async () => false);
    ensureAuthenticated = vi.fn(async () => undefined);
    signIn = vi.fn(async () => ({ ok: true, token: "tok_new" }));
    signOut = vi.fn(async () => undefined);
    getToken = vi.fn(() => undefined);

    deps: Record<string, unknown>;

    constructor(deps: Record<string, unknown>) {
      this.deps = deps;
      authInstances.push(this);
    }
  }

  const vscode = {
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string) => configurationValues[key]),
      })),
      onDidChangeConfiguration: vi.fn((watcher) => {
        configurationWatchers.push(watcher);
        return { dispose: vi.fn() };
      }),
    },
    window: {
      createStatusBarItem: vi.fn(() => statusBarItem),
      showInformationMessage: vi.fn(async () => undefined),
      showErrorMessage: vi.fn(async () => undefined),
      withProgress: vi.fn(async (_options, task) => task()),
    },
    commands: {
      registerCommand: vi.fn((_command: string, _callback: unknown) => ({
        dispose: vi.fn(),
      })),
    },
    env: {
      openExternal: vi.fn(async () => true),
    },
    Uri: {
      parse: vi.fn((value: string) => ({ toString: () => value })),
    },
    ProgressLocation: { Notification: 15 },
    StatusBarAlignment: { Right: 2 },
  };

  return {
    authInstances,
    bridgeInstances,
    configurationValues,
    configurationWatchers,
    statusBarItem,
    subscriptions,
    vscode,
    installTerminalAutoWrap: vi.fn(async () => null),
    installClaudeCodeAdapter: vi.fn(async () => null),
    removeClaudeCodeAdapter: vi.fn(async () => undefined),
    MockAuthManager,
  };
});

vi.mock("vscode", () => mocks.vscode);

vi.mock("./auth", () => ({
  AuthManager: mocks.MockAuthManager,
  FileTokenMirror: class FileTokenMirror {},
  TOKEN_SECRET_KEY: "spinshare.deviceAuthToken",
  formatSignInFailure: (reason: string, detail?: string) => detail ?? reason,
  tokenSecretKeyForBaseUrl: (baseUrl: string) =>
    `spinshare.deviceAuthToken:${encodeURIComponent(
      baseUrl.trim().replace(/\/+$/, "").toLowerCase(),
    )}`,
}));

vi.mock("./terminal-auto-wrap", () => ({
  installTerminalAutoWrap: mocks.installTerminalAutoWrap,
  normalizeTerminalAgents: (agents: unknown[] | undefined) =>
    Array.isArray(agents) && agents.length > 0 ? agents : ["claude"],
}));

vi.mock("./claude-code-adapter", () => ({
  installClaudeCodeAdapter: mocks.installClaudeCodeAdapter,
  removeClaudeCodeAdapter: mocks.removeClaudeCodeAdapter,
}));

vi.mock("./claude-code-state-bridge", () => ({
  ClaudeCodeStateBridge: class ClaudeCodeStateBridge {
    options: Record<string, unknown>;
    start = vi.fn();
    dispose = vi.fn();

    constructor(options: Record<string, unknown>) {
      this.options = options;
      mocks.bridgeInstances.push(this);
    }
  },
}));

function makeContext() {
  return {
    secrets: {
      get: vi.fn(async () => undefined),
      store: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    },
    extensionPath: "C:\\spinshare-extension",
    globalStorageUri: { fsPath: "C:\\spinshare-storage" },
    environmentVariableCollection: {},
    subscriptions: mocks.subscriptions,
  };
}

async function flushActivationPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authInstances.length = 0;
    mocks.bridgeInstances.length = 0;
    for (const key of Object.keys(mocks.configurationValues)) {
      delete mocks.configurationValues[key];
    }
    mocks.configurationWatchers.length = 0;
    mocks.subscriptions.length = 0;
    mocks.statusBarItem.text = "";
    mocks.statusBarItem.tooltip = "";
    mocks.statusBarItem.command = "";
  });

  it("shows a persistent sign-in status item when activation finds no token", async () => {
    const { activate } = await import("./extension");

    activate(makeContext() as never);
    await flushActivationPromises();

    expect(mocks.vscode.window.createStatusBarItem).toHaveBeenCalledWith(
      mocks.vscode.StatusBarAlignment.Right,
      expect.any(Number),
    );
    expect(mocks.statusBarItem.text).toBe("$(account) SpinShare Sign in");
    expect(mocks.statusBarItem.command).toBe("spinshare.signIn");
    expect(mocks.statusBarItem.show).toHaveBeenCalledOnce();
    expect(mocks.authInstances[0]?.deps).toMatchObject({
      tokenSecretKey:
        "spinshare.deviceAuthToken:https%3A%2F%2Fwww.spinshare.dev",
      legacyTokenSecretKeys: ["spinshare.deviceAuthToken"],
    });
  });

  it("prompts sign-in during activation when no token is loaded", async () => {
    const { activate } = await import("./extension");

    activate(makeContext() as never);
    await flushActivationPromises();

    expect(mocks.authInstances[0]?.initialize).toHaveBeenCalledOnce();
    expect(mocks.authInstances[0]?.isAuthenticated).toHaveBeenCalledOnce();
    expect(mocks.authInstances[0]?.ensureAuthenticated).toHaveBeenCalledOnce();
    expect(mocks.statusBarItem.show).toHaveBeenCalledOnce();
    expect(mocks.statusBarItem.hide).not.toHaveBeenCalled();
  });

  it("starts a Claude Code state bridge after installing the adapter", async () => {
    mocks.installClaudeCodeAdapter.mockResolvedValueOnce({
      stateFilePath: "C:\\spinshare-storage\\claude-code-adapter\\state.json",
    });
    const { activate } = await import("./extension");

    activate(makeContext() as never);
    await flushActivationPromises();

    expect(mocks.bridgeInstances).toHaveLength(1);
    expect(mocks.bridgeInstances[0]?.options).toMatchObject({
      stateFilePath: "C:\\spinshare-storage\\claude-code-adapter\\state.json",
    });
    expect(mocks.bridgeInstances[0]?.start).toHaveBeenCalledOnce();
  });

  it("disposes the Claude Code state bridge when the adapter is disabled", async () => {
    mocks.installClaudeCodeAdapter.mockResolvedValueOnce({
      stateFilePath: "C:\\spinshare-storage\\claude-code-adapter\\state.json",
    });
    const { activate } = await import("./extension");

    activate(makeContext() as never);
    await flushActivationPromises();

    const bridge = mocks.bridgeInstances[0];
    mocks.configurationValues.claudeCodeAdapter = false;
    mocks.configurationWatchers[0]?.({
      affectsConfiguration: (setting) =>
        setting === "spinshare.claudeCodeAdapter",
    });
    await flushActivationPromises();

    expect(bridge?.dispose).toHaveBeenCalledOnce();
    expect(mocks.removeClaudeCodeAdapter).toHaveBeenCalledWith({
      baseUrl: "https://www.spinshare.dev",
      storageRoot: "C:\\spinshare-storage",
    });
  });
});
