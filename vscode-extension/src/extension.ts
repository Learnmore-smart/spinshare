import * as vscode from "vscode";

import { AdController } from "./ad-controller";
import { AdApiClient, DEFAULT_BASE_URL, normalizeBaseUrl } from "./api-client";
import {
  AuthManager,
  FileTokenMirror,
  TOKEN_SECRET_KEY,
  formatSignInFailure,
  tokenSecretKeyForBaseUrl,
} from "./auth";
import {
  installClaudeCodeAdapter,
  removeClaudeCodeAdapter,
} from "./claude-code-adapter";
import { ClaudeCodeStateBridge } from "./claude-code-state-bridge";
import {
  installTerminalAutoWrap,
  normalizeTerminalAgents,
} from "./terminal-auto-wrap";

/**
 * SpinShare VSCode extension entry point.
 *
 * Uses only APIs from the stable `vscode` namespace so it runs unchanged in
 * VSCode and VSCode-compatible editors (Trae, Cursor).
 *
 * Wiring:
 *   - {@link AuthManager} owns the Device_Auth_Token and the browser device
 *     flow, persisting to `context.secrets` (stable secure storage).
 *   - {@link AdController} shows ads in a progress notification and reports a
 *     single impression; it reads the bearer token through the auth manager's
 *     synchronous `getToken` hook.
 *   - Before any ad is displayed we call `ensureAuthenticated`, which prompts an
 *     unauthenticated developer to complete the device flow first
 *     (Requirement 6.4). If they decline, no ad is shown.
 *
 * Requirements: 6.4 (auth prompt before ads), 6.5 (stable-API portability).
 */
export function activate(context: vscode.ExtensionContext): void {
  const baseUrl = normalizeBaseUrl(
    vscode.workspace.getConfiguration("spinshare").get<string>("baseUrl") ??
      DEFAULT_BASE_URL,
  );

  const client = new AdApiClient({ baseUrl });
  const signInStatus = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  signInStatus.text = "$(account) SpinShare Sign in";
  signInStatus.tooltip = "Sign in to SpinShare so Claude Code ads can be credited to you.";
  signInStatus.command = "spinshare.signIn";
  let claudeCodeStateBridge: ClaudeCodeStateBridge | null = null;

  const openExternal = (url: string): void => {
    void vscode.env.openExternal(vscode.Uri.parse(url));
  };

  const showSignInStatus = (): void => {
    signInStatus.show();
  };

  const hideSignInStatus = (): void => {
    signInStatus.hide();
  };

  const auth = new AuthManager({
    vscode,
    client,
    secrets: context.secrets,
    tokenMirror: new FileTokenMirror(undefined, undefined, baseUrl),
    tokenSecretKey: tokenSecretKeyForBaseUrl(baseUrl),
    legacyTokenSecretKeys: baseUrl === DEFAULT_BASE_URL ? [TOKEN_SECRET_KEY] : [],
    onError: (error) => console.error("[spinshare] auth error", error),
    runWithProgress: (title, task) =>
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title,
          cancellable: false,
        },
        task,
      ),
  });

  const controller = new AdController({
    vscode,
    client,
    // Synchronous token hook backed by the auth manager's in-memory cache.
    getToken: () => auth.getToken(),
    // Open the ad's click-through URL in the system browser when the developer
    // clicks the "Open" action on a clickable ad.
    openUrl: openExternal,
    onError: (error) => console.error("[spinshare] ad error", error),
  });

  const stopClaudeCodeStateBridge = (): void => {
    if (claudeCodeStateBridge === null) {
      return;
    }
    claudeCodeStateBridge.dispose();
    claudeCodeStateBridge = null;
  };

  const startClaudeCodeStateBridge = (stateFilePath: string): void => {
    stopClaudeCodeStateBridge();
    claudeCodeStateBridge = new ClaudeCodeStateBridge({
      vscode,
      stateFilePath,
      openUrl: openExternal,
      onError: (error) =>
        console.error("[spinshare] claude code state bridge error", error),
    });
    claudeCodeStateBridge.start();
  };

  const refreshTerminalAutoWrap = async (
    showMessage = false,
  ): Promise<void> => {
    const config = vscode.workspace.getConfiguration("spinshare");
    const enabled = config.get<boolean>("terminalAutoWrap") ?? true;
    const agents = normalizeTerminalAgents(
      config.get<unknown[]>("terminalAgents"),
    );
    const terminalBaseUrl = normalizeBaseUrl(
      config.get<string>("baseUrl") ?? DEFAULT_BASE_URL,
    );

    try {
      const plan = await installTerminalAutoWrap({
        enabled,
        agents,
        baseUrl: terminalBaseUrl,
        extensionRoot: context.extensionPath,
        storageRoot: context.globalStorageUri.fsPath,
        collection: context.environmentVariableCollection,
      });

      if (!showMessage) {
        return;
      }

      if (plan === null) {
        void vscode.window.showInformationMessage(
          "SpinShare terminal auto-wrap is disabled.",
        );
        return;
      }

      void vscode.window.showInformationMessage(
        `SpinShare terminal auto-wrap ready for: ${agents.join(
          ", ",
        )}. Open a new terminal to use it.`,
      );
    } catch (error) {
      console.error("[spinshare] terminal auto-wrap error", error);
      if (showMessage) {
        void vscode.window.showErrorMessage(
          `SpinShare could not rebuild terminal shims: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  };

  void refreshTerminalAutoWrap();

  const refreshClaudeCodeAdapter = async (
    showMessage = false,
  ): Promise<void> => {
    const config = vscode.workspace.getConfiguration("spinshare");
    const enabled = config.get<boolean>("claudeCodeAdapter") ?? true;
    const adapterBaseUrl = normalizeBaseUrl(
      config.get<string>("baseUrl") ?? DEFAULT_BASE_URL,
    );

    try {
      if (!enabled) {
        stopClaudeCodeStateBridge();
        await removeClaudeCodeAdapter({
          baseUrl: adapterBaseUrl,
          storageRoot: context.globalStorageUri.fsPath,
        });
        if (showMessage) {
          void vscode.window.showInformationMessage(
            "SpinShare Claude Code adapter is removed.",
          );
        }
        return;
      }

      const plan = await installClaudeCodeAdapter({
        baseUrl: adapterBaseUrl,
        storageRoot: context.globalStorageUri.fsPath,
      });

      if (plan === null) {
        stopClaudeCodeStateBridge();
        if (!showMessage) {
          return;
        }
        void vscode.window.showInformationMessage(
          "SpinShare Claude Code adapter is disabled.",
        );
        return;
      }
      startClaudeCodeStateBridge(plan.stateFilePath);

      if (!showMessage) {
        return;
      }
      void vscode.window.showInformationMessage(
        "SpinShare Claude Code hooks/statusLine adapter installed.",
      );
    } catch (error) {
      console.error("[spinshare] claude code adapter error", error);
      if (showMessage) {
        void vscode.window.showErrorMessage(
          `SpinShare could not install Claude Code adapter: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  };

  void refreshClaudeCodeAdapter();

  // Warm the token cache from secure storage so `getToken()` is populated.
  // If the developer is not signed in yet, prompt immediately on activation
  // (Requirement 6.4) instead of waiting for a generation hook.
  void auth
    .initialize()
    .then(async () => {
      if (await auth.isAuthenticated()) {
        hideSignInStatus();
        return;
      }

      showSignInStatus();
      const token = await auth.ensureAuthenticated();
      if (token !== undefined) {
        hideSignInStatus();
        void vscode.window.showInformationMessage("Signed in to SpinShare.");
      }
    })
    .catch((error) => {
      showSignInStatus();
      console.error("[spinshare] auth initialization error", error);
    });

  const showStatus = vscode.commands.registerCommand(
    "spinshare.showStatus",
    () => {
      void vscode.window.showInformationMessage("SpinShare is active.");
    },
  );

  const signIn = vscode.commands.registerCommand(
    "spinshare.signIn",
    async () => {
      const result = await auth.signIn();
      if (result.ok) {
        hideSignInStatus();
        void vscode.window.showInformationMessage("Signed in to SpinShare.");
      } else if (result.reason !== "cancelled") {
        showSignInStatus();
        void vscode.window.showErrorMessage(
          formatSignInFailure(result.reason, result.detail),
        );
      } else {
        showSignInStatus();
      }
    },
  );

  const signOut = vscode.commands.registerCommand(
    "spinshare.signOut",
    async () => {
      await auth.signOut();
      showSignInStatus();
      void vscode.window.showInformationMessage("Signed out of SpinShare.");
    },
  );

  // Generation lifecycle hooks. A host integration calls these around AI
  // generation; we gate the start on authentication so an unauthenticated
  // developer is prompted to sign in before any ad displays.
  const startGeneration = vscode.commands.registerCommand(
    "spinshare.startGeneration",
    async () => {
      const token = await auth.ensureAuthenticated();
      if (token === undefined) {
        // Developer is not authenticated and declined/failed sign-in: show no ad.
        return;
      }
      await controller.startGeneration();
    },
  );

  const completeGeneration = vscode.commands.registerCommand(
    "spinshare.completeGeneration",
    () => {
      controller.completeGeneration();
    },
  );

  const rebuildTerminalShims = vscode.commands.registerCommand(
    "spinshare.rebuildTerminalShims",
    async () => {
      await refreshTerminalAutoWrap(true);
    },
  );

  const removeClaudeAdapter = vscode.commands.registerCommand(
    "spinshare.removeClaudeCodeAdapter",
    async () => {
      const config = vscode.workspace.getConfiguration("spinshare");
      await removeClaudeCodeAdapter({
        baseUrl: normalizeBaseUrl(
          config.get<string>("baseUrl") ?? DEFAULT_BASE_URL,
        ),
        storageRoot: context.globalStorageUri.fsPath,
      });
      void vscode.window.showInformationMessage(
        "SpinShare Claude Code adapter removed.",
      );
    },
  );

  const terminalAutoWrapConfigWatcher =
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("spinshare.baseUrl") ||
        event.affectsConfiguration("spinshare.terminalAutoWrap") ||
        event.affectsConfiguration("spinshare.terminalAgents")
      ) {
        void refreshTerminalAutoWrap();
      }
      if (
        event.affectsConfiguration("spinshare.baseUrl") ||
        event.affectsConfiguration("spinshare.claudeCodeAdapter")
      ) {
        void refreshClaudeCodeAdapter();
      }
    });

  context.subscriptions.push(
    showStatus,
    signIn,
    signOut,
    startGeneration,
    completeGeneration,
    rebuildTerminalShims,
    removeClaudeAdapter,
    terminalAutoWrapConfigWatcher,
    signInStatus,
    {
      dispose: () => {
        controller.dispose();
        stopClaudeCodeStateBridge();
      },
    },
  );
}

export function deactivate(): void {
  // Disposables registered via context.subscriptions are cleaned up by the
  // host automatically; nothing extra to tear down.
}
