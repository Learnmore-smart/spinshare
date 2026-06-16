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
  const authInstances: Array<{
    initialize: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    ensureAuthenticated: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
  }> = [];

  class MockAuthManager {
    initialize = vi.fn(async () => undefined);
    isAuthenticated = vi.fn(async () => false);
    ensureAuthenticated = vi.fn(async () => undefined);
    signIn = vi.fn(async () => ({ ok: true, token: "tok_new" }));
    signOut = vi.fn(async () => undefined);
    getToken = vi.fn(() => undefined);

    constructor() {
      authInstances.push(this);
    }
  }

  const vscode = {
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((_key: string) => undefined),
      })),
      onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
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
  formatSignInFailure: (reason: string, detail?: string) => detail ?? reason,
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
  });
});
