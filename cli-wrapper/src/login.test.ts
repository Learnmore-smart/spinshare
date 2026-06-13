import { describe, expect, it, vi } from "vitest";
import { runLogin, type RunLoginDeps } from "./login.js";
import type {
  DeviceAuthApi,
  DeviceFlowStart,
  DeviceTokenPoll,
} from "./api-client.js";
import type { CredentialStore } from "./credential-store.js";

const START: DeviceFlowStart = {
  deviceCode: "dc_1",
  userCode: "WXYZ-1234",
  verificationUri: "https://spinshare.dev/activate",
  verificationUriComplete: "https://spinshare.dev/activate?user_code=WXYZ-1234",
  intervalSec: 1,
  expiresInSec: 300,
};

function memoryStore(): CredentialStore & { value: string | null } {
  const state = { value: null as string | null };
  return {
    get value() {
      return state.value;
    },
    async load() {
      return state.value;
    },
    async save(token) {
      state.value = token;
    },
    async clear() {
      state.value = null;
    },
  };
}

/** Build deps with a scripted sequence of poll results. */
function deps(
  polls: DeviceTokenPoll[],
  overrides: Partial<RunLoginDeps> = {},
): { d: RunLoginDeps; store: ReturnType<typeof memoryStore>; out: string[]; err: string[] } {
  const store = memoryStore();
  const out: string[] = [];
  const err: string[] = [];
  let i = 0;
  const api: DeviceAuthApi = {
    startDeviceFlow: async () => START,
    pollDeviceToken: async () => polls[Math.min(i++, polls.length - 1)]!,
  };
  const d: RunLoginDeps = {
    api,
    store,
    openBrowser: async () => true,
    sleep: async () => {},
    now: () => 0,
    stdout: { write: (s: string) => (out.push(String(s)), true) } as never,
    stderr: { write: (s: string) => (err.push(String(s)), true) } as never,
    ...overrides,
  };
  return { d, store, out, err };
}

describe("runLogin", () => {
  it("stores the token and returns 0 on approval", async () => {
    const { d, store } = deps([
      { status: "authorization_pending" },
      { status: "approved", accessToken: "tok_xyz", tokenType: "Bearer" },
    ]);
    expect(await runLogin(d)).toBe(0);
    expect(store.value).toBe("tok_xyz");
  });

  it("prints the URL when the browser cannot launch", async () => {
    const { d, out } = deps([{ status: "approved", accessToken: "t", tokenType: "Bearer" }], {
      openBrowser: async () => false,
    });
    await runLogin(d);
    expect(out.join("")).toContain(START.verificationUriComplete);
  });

  it("backs off on slow_down before approval", async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const { d, store } = deps(
      [
        { status: "slow_down" },
        { status: "approved", accessToken: "tok", tokenType: "Bearer" },
      ],
      { sleep },
    );
    expect(await runLogin(d)).toBe(0);
    expect(store.value).toBe("tok");
    // First sleep at base interval (1000ms), second after slow_down (+5000ms).
    expect(sleep.mock.calls[0]?.[0]).toBe(1000);
    expect(sleep.mock.calls[1]?.[0]).toBe(6000);
  });

  it("returns 1 on access_denied without storing a token", async () => {
    const { d, store } = deps([{ status: "access_denied" }]);
    expect(await runLogin(d)).toBe(1);
    expect(store.value).toBeNull();
  });

  it("returns 1 on expired_token", async () => {
    const { d } = deps([{ status: "expired_token" }]);
    expect(await runLogin(d)).toBe(1);
  });

  it("returns 1 when the deadline passes before approval (timeout)", async () => {
    // now advances past the deadline on the second check.
    let t = 0;
    const { d } = deps([{ status: "authorization_pending" }], {
      now: () => {
        const v = t;
        t += 200_000; // jump past expiresInSec (300s) within two reads
        return v;
      },
    });
    expect(await runLogin(d)).toBe(1);
  });

  it("returns 1 when startDeviceFlow fails", async () => {
    const { d } = deps([], {
      api: {
        startDeviceFlow: async () => {
          throw new Error("network down");
        },
        pollDeviceToken: async () => ({ status: "error", message: "n/a" }),
      },
    });
    expect(await runLogin(d)).toBe(1);
  });
});
