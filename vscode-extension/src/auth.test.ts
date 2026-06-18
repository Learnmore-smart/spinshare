import { describe, it, expect } from "vitest";
import {
  AuthManager,
  SIGN_IN_ACTION,
  TOKEN_SECRET_KEY,
  tokenSecretKeyForBaseUrl,
  type AuthVsCodeLike,
  type DeviceAuthClientLike,
  type SecretStorageLike,
  type UriLike,
} from "./auth";
import type {
  DeviceFlowStart,
  DeviceTokenResult,
  DeviceTokenValidation,
} from "./api-client";

/**
 * Unit tests for AuthManager (task 14.3, Requirement 6.4).
 *
 * Everything is injected, so these run with no editor, network, or real timers.
 */

/** In-memory secret store mirroring `vscode.SecretStorage`. */
function makeSecrets(initial?: Record<string, string>): {
  secrets: SecretStorageLike;
  store: Map<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  const secrets: SecretStorageLike = {
    get: async (key) => store.get(key),
    store: async (key, value) => {
      store.set(key, value);
    },
    delete: async (key) => {
      store.delete(key);
    },
  };
  return { secrets, store };
}

interface MockVsCode {
  vscode: AuthVsCodeLike;
  prompts: string[];
  opened: string[];
  /** Set the action the developer "clicks" in response to the prompt. */
  setChoice: (choice: string | undefined) => void;
}

function makeVscode(choice: string | undefined = SIGN_IN_ACTION): MockVsCode {
  const prompts: string[] = [];
  const opened: string[] = [];
  let nextChoice = choice;
  const vscode: AuthVsCodeLike = {
    window: {
      showInformationMessage: async (message: string) => {
        prompts.push(message);
        return nextChoice;
      },
      showErrorMessage: async (message: string) => {
        prompts.push(`ERROR: ${message}`);
        return undefined;
      },
    },
    env: {
      openExternal: async (target: UriLike) => {
        opened.push(target.toString());
        return true;
      },
    },
    Uri: {
      parse: (value: string): UriLike => ({ toString: () => value }),
    },
  };
  return {
    vscode,
    prompts,
    opened,
    setChoice: (c) => {
      nextChoice = c;
    },
  };
}

const START: DeviceFlowStart = {
  deviceCode: "dc_1",
  userCode: "WXYZ-1234",
  verificationUri: "https://spinshare.dev/activate",
  verificationUriComplete: "https://spinshare.dev/activate?user_code=WXYZ-1234",
  intervalSec: 1,
  expiresInSec: 300,
};

/** Client that returns the queued poll results in order. */
function makeClient(
  pollResults: DeviceTokenResult[],
  validation: DeviceTokenValidation = "valid",
): DeviceAuthClientLike {
  let i = 0;
  return {
    validateDeviceToken: async () => validation,
    startDeviceFlow: async () => START,
    pollDeviceToken: async () => {
      const r = pollResults[Math.min(i, pollResults.length - 1)];
      i++;
      return r;
    },
  };
}

const noSleep = async (): Promise<void> => {};

describe("AuthManager", () => {
  it("returns the stored token without prompting when already authenticated", async () => {
    const { secrets } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok_existing" });
    const ui = makeVscode();
    const auth = new AuthManager({
      vscode: ui.vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
    });

    const token = await auth.ensureAuthenticated();

    expect(token).toBe("tok_existing");
    expect(ui.prompts).toEqual([]);
    expect(auth.getToken()).toBe("tok_existing");
  });

  it("keeps localhost and production tokens in separate secret keys", async () => {
    const localKey = tokenSecretKeyForBaseUrl("http://localhost:3000/");
    const prodKey = tokenSecretKeyForBaseUrl("https://www.spinshare.dev");

    expect(localKey).not.toBe(prodKey);
    expect(localKey).not.toBe(TOKEN_SECRET_KEY);
    expect(prodKey).not.toBe(TOKEN_SECRET_KEY);
  });

  it("does not load the legacy production token for localhost", async () => {
    const { secrets } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok_prod" });
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
      tokenSecretKey: tokenSecretKeyForBaseUrl("http://localhost:3000"),
    });

    await expect(auth.initialize()).resolves.toBeUndefined();
    expect(auth.getToken()).toBeUndefined();
  });

  it("migrates the legacy token into the production base-url key", async () => {
    const prodKey = tokenSecretKeyForBaseUrl("https://www.spinshare.dev");
    const { secrets, store } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok_prod" });
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
      tokenSecretKey: prodKey,
      legacyTokenSecretKeys: [TOKEN_SECRET_KEY],
    });

    await expect(auth.initialize()).resolves.toBe("tok_prod");
    expect(store.get(prodKey)).toBe("tok_prod");
    expect(auth.getToken()).toBe("tok_prod");
  });

  it("mirrors an existing stored token during initialize", async () => {
    const { secrets } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok_existing" });
    const mirrored: string[] = [];
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
      tokenMirror: {
        save: async (token) => {
          mirrored.push(token);
        },
        clear: async () => {
          mirrored.push("CLEARED");
        },
      },
    });

    const token = await auth.initialize();

    expect(token).toBe("tok_existing");
    expect(auth.getToken()).toBe("tok_existing");
    expect(mirrored).toEqual(["tok_existing"]);
  });

  it("clears invalid stored tokens and the shared token mirror during initialize", async () => {
    const prodKey = tokenSecretKeyForBaseUrl("https://www.spinshare.dev");
    const { secrets, store } = makeSecrets({
      [prodKey]: "tok_bad",
      [TOKEN_SECRET_KEY]: "tok_bad_legacy",
    });
    const mirrored: string[] = [];
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }], "invalid"),
      secrets,
      sleep: noSleep,
      tokenSecretKey: prodKey,
      legacyTokenSecretKeys: [TOKEN_SECRET_KEY],
      tokenMirror: {
        save: async (token) => {
          mirrored.push(token);
        },
        clear: async () => {
          mirrored.push("CLEARED");
        },
      },
    });

    await expect(auth.initialize()).resolves.toBeUndefined();

    expect(store.has(prodKey)).toBe(false);
    expect(store.has(TOKEN_SECRET_KEY)).toBe(false);
    expect(auth.getToken()).toBeUndefined();
    expect(mirrored).toEqual(["CLEARED"]);
  });

  it("keeps stored tokens when validation is unavailable", async () => {
    const { secrets } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok_offline" });
    const mirrored: string[] = [];
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }], "unknown"),
      secrets,
      sleep: noSleep,
      tokenMirror: {
        save: async (token) => {
          mirrored.push(token);
        },
        clear: async () => {
          mirrored.push("CLEARED");
        },
      },
    });

    await expect(auth.initialize()).resolves.toBe("tok_offline");
    expect(auth.getToken()).toBe("tok_offline");
    expect(mirrored).toEqual(["tok_offline"]);
  });

  it("does not clear the shared token mirror when initialize finds no stored token", async () => {
    const { secrets } = makeSecrets();
    const mirrored: string[] = [];
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
      tokenMirror: {
        save: async (token) => {
          mirrored.push(token);
        },
        clear: async () => {
          mirrored.push("CLEARED");
        },
      },
    });

    const token = await auth.initialize();

    expect(token).toBeUndefined();
    expect(auth.getToken()).toBeUndefined();
    expect(mirrored).toEqual([]);
  });

  it("prompts, runs the device flow, and persists the token when unauthenticated", async () => {
    const { secrets, store } = makeSecrets();
    const ui = makeVscode(SIGN_IN_ACTION);
    const auth = new AuthManager({
      vscode: ui.vscode,
      client: makeClient([
        { status: "pending" },
        { status: "approved", accessToken: "tok_new", tokenType: "Bearer" },
      ]),
      secrets,
      sleep: noSleep,
    });

    const token = await auth.ensureAuthenticated();

    expect(token).toBe("tok_new");
    expect(ui.prompts).toHaveLength(1);
    expect(ui.opened).toEqual([START.verificationUriComplete]);
    expect(store.get(TOKEN_SECRET_KEY)).toBe("tok_new");
    expect(auth.getToken()).toBe("tok_new");
  });

  it("mirrors tokens for external Claude Code hook scripts when configured", async () => {
    const { secrets } = makeSecrets();
    const mirrored: string[] = [];
    const auth = new AuthManager({
      vscode: makeVscode(SIGN_IN_ACTION).vscode,
      client: makeClient([
        { status: "pending" },
        { status: "approved", accessToken: "tok_new", tokenType: "Bearer" },
      ]),
      secrets,
      sleep: noSleep,
      tokenMirror: {
        save: async (token) => {
          mirrored.push(token);
        },
        clear: async () => {
          mirrored.push("CLEARED");
        },
      },
    });

    const result = await auth.signIn();
    await auth.signOut();

    expect(result).toEqual({ ok: true, token: "tok_new" });
    expect(mirrored).toEqual(["tok_new", "CLEARED"]);
  });

  it("does not display ads (returns undefined) when the developer dismisses the prompt", async () => {
    const { secrets } = makeSecrets();
    const ui = makeVscode();
    ui.setChoice(undefined); // developer dismisses the prompt
    const auth = new AuthManager({
      vscode: ui.vscode,
      client: makeClient([{ status: "approved", accessToken: "x", tokenType: "Bearer" }]),
      secrets,
      sleep: noSleep,
    });

    const token = await auth.ensureAuthenticated();

    expect(token).toBeUndefined();
    expect(ui.prompts).toHaveLength(1);
    expect(ui.opened).toEqual([]);
    expect(auth.getToken()).toBeUndefined();
  });

  it("fails the sign-in when the device flow is denied", async () => {
    const { secrets, store } = makeSecrets();
    const ui = makeVscode();
    const auth = new AuthManager({
      vscode: ui.vscode,
      client: makeClient([{ status: "denied" }]),
      secrets,
      sleep: noSleep,
    });

    const result = await auth.signIn();

    expect(result).toEqual({ ok: false, reason: "denied" });
    expect(store.has(TOKEN_SECRET_KEY)).toBe(false);
  });

  it("times out (expired) when the deadline passes without approval", async () => {
    const { secrets } = makeSecrets();
    const ui = makeVscode();
    // Clock jumps past the 300s deadline after the first poll.
    let t = 0;
    const auth = new AuthManager({
      vscode: ui.vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
      now: () => {
        const cur = t;
        t += 200_000; // advance 200s per read → exceeds 300s quickly
        return cur;
      },
    });

    const result = await auth.signIn();

    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("isAuthenticated reflects stored token", async () => {
    const { secrets } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok" });
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
    });

    expect(await auth.isAuthenticated()).toBe(true);
  });

  it("signOut clears the token from storage and cache", async () => {
    const { secrets, store } = makeSecrets({ [TOKEN_SECRET_KEY]: "tok" });
    const auth = new AuthManager({
      vscode: makeVscode().vscode,
      client: makeClient([{ status: "pending" }]),
      secrets,
      sleep: noSleep,
    });

    await auth.initialize();
    await auth.signOut();

    expect(store.has(TOKEN_SECRET_KEY)).toBe(false);
    expect(auth.getToken()).toBeUndefined();
    expect(await auth.isAuthenticated()).toBe(false);
  });
});
