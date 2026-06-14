import * as vscode from "vscode";

import { AdController } from "./ad-controller";
import { AdApiClient, DEFAULT_BASE_URL } from "./api-client";
import { AuthManager, formatSignInFailure } from "./auth";

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
  const baseUrl =
    vscode.workspace.getConfiguration("spinshare").get<string>("baseUrl") ??
    DEFAULT_BASE_URL;

  const client = new AdApiClient({ baseUrl });

  const auth = new AuthManager({
    vscode,
    client,
    secrets: context.secrets,
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
    openUrl: (url) => {
      void vscode.env.openExternal(vscode.Uri.parse(url));
    },
    onError: (error) => console.error("[spinshare] ad error", error),
  });

  // Warm the token cache from secure storage so `getToken()` is populated.
  // If the developer is not signed in yet, prompt immediately on activation
  // (Requirement 6.4) instead of waiting for a generation hook.
  void auth.initialize().then(async () => {
    if (!(await auth.isAuthenticated())) {
      const token = await auth.ensureAuthenticated();
      if (token !== undefined) {
        void vscode.window.showInformationMessage("Signed in to SpinShare.");
      }
    }
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
        void vscode.window.showInformationMessage("Signed in to SpinShare.");
      } else if (result.reason !== "cancelled") {
        void vscode.window.showErrorMessage(
          formatSignInFailure(result.reason, result.detail),
        );
      }
    },
  );

  const signOut = vscode.commands.registerCommand(
    "spinshare.signOut",
    async () => {
      await auth.signOut();
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

  context.subscriptions.push(
    showStatus,
    signIn,
    signOut,
    startGeneration,
    completeGeneration,
    { dispose: () => controller.dispose() },
  );
}

export function deactivate(): void {
  // Disposables registered via context.subscriptions are cleaned up by the
  // host automatically; nothing extra to tear down.
}
