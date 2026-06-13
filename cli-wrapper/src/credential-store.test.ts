import { describe, expect, it } from "vitest";
import {
  FileCredentialStore,
  KeytarCredentialStore,
  createCredentialStore,
  defaultCredentialFilePath,
  CREDENTIAL_FILE_MODE,
  type CredentialFileFs,
  type KeytarLike,
} from "./credential-store.js";

/** In-memory {@link CredentialFileFs} recording the last write mode. */
function memoryFs(): CredentialFileFs & {
  files: Map<string, string>;
  lastMode: number | null;
  chmodMode: number | null;
} {
  const files = new Map<string, string>();
  const state = { files, lastMode: null as number | null, chmodMode: null as number | null };
  return {
    files,
    get lastMode() {
      return state.lastMode;
    },
    get chmodMode() {
      return state.chmodMode;
    },
    async readFile(filePath) {
      const v = files.get(filePath);
      if (v === undefined) throw new Error("ENOENT");
      return v;
    },
    async writeFile(filePath, data, mode) {
      state.lastMode = mode;
      files.set(filePath, data);
    },
    async mkdir() {
      /* no-op */
    },
    async chmod(_filePath, mode) {
      state.chmodMode = mode;
    },
    async rm(filePath) {
      files.delete(filePath);
    },
  };
}

describe("FileCredentialStore", () => {
  it("round-trips a token through save/load", async () => {
    const fs = memoryFs();
    const store = new FileCredentialStore({ filePath: "/cfg/credentials.json", fs });
    expect(await store.load()).toBeNull();
    await store.save("tok_abc");
    expect(await store.load()).toBe("tok_abc");
  });

  it("writes the file with 0600 permissions and hardens via chmod", async () => {
    const fs = memoryFs();
    const store = new FileCredentialStore({ filePath: "/cfg/credentials.json", fs });
    await store.save("tok");
    expect(fs.lastMode).toBe(CREDENTIAL_FILE_MODE);
    expect(fs.chmodMode).toBe(CREDENTIAL_FILE_MODE);
  });

  it("clear removes the stored token and is idempotent", async () => {
    const fs = memoryFs();
    const store = new FileCredentialStore({ filePath: "/cfg/credentials.json", fs });
    await store.save("tok");
    await store.clear();
    expect(await store.load()).toBeNull();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it("returns null for corrupt JSON", async () => {
    const fs = memoryFs();
    fs.files.set("/cfg/credentials.json", "not json{");
    const store = new FileCredentialStore({ filePath: "/cfg/credentials.json", fs });
    expect(await store.load()).toBeNull();
  });
});

describe("defaultCredentialFilePath", () => {
  it("honors XDG_CONFIG_HOME then falls back to ~/.config", () => {
    expect(defaultCredentialFilePath({ XDG_CONFIG_HOME: "/xdg" }, "/home/u")).toContain(
      "spinshare",
    );
    expect(defaultCredentialFilePath({ XDG_CONFIG_HOME: "/xdg" }, "/home/u")).toMatch(
      /credentials\.json$/,
    );
    const fallback = defaultCredentialFilePath({}, "/home/u");
    expect(fallback).toContain(".config");
  });
});

describe("KeytarCredentialStore", () => {
  function fakeKeytar(): KeytarLike & { vault: Map<string, string> } {
    const vault = new Map<string, string>();
    return {
      vault,
      async getPassword(s, a) {
        return vault.get(`${s}:${a}`) ?? null;
      },
      async setPassword(s, a, p) {
        vault.set(`${s}:${a}`, p);
      },
      async deletePassword(s, a) {
        return vault.delete(`${s}:${a}`);
      },
    };
  }

  it("round-trips through the keychain", async () => {
    const kt = fakeKeytar();
    const store = new KeytarCredentialStore(kt);
    await store.save("tok_keytar");
    expect(await store.load()).toBe("tok_keytar");
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});

describe("createCredentialStore", () => {
  it("uses keytar when the loader returns a module", async () => {
    const kt: KeytarLike = {
      async getPassword() {
        return "from-keytar";
      },
      async setPassword() {
        /* no-op */
      },
      async deletePassword() {
        return true;
      },
    };
    const store = await createCredentialStore({ keytarLoader: async () => kt });
    expect(store).toBeInstanceOf(KeytarCredentialStore);
    expect(await store.load()).toBe("from-keytar");
  });

  it("falls back to the file store when keytar is unavailable", async () => {
    const fs = memoryFs();
    const store = await createCredentialStore({
      keytarLoader: async () => null,
      filePath: "/cfg/credentials.json",
      fs,
    });
    expect(store).toBeInstanceOf(FileCredentialStore);
    await store.save("file-tok");
    expect(await store.load()).toBe("file-tok");
  });
});
