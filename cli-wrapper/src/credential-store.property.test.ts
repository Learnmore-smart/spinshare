import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  FileCredentialStore,
  type CredentialFileFs,
  type CredentialStore,
} from "./credential-store.js";

/**
 * Feature: spinshare-ad-exchange, Property 20: Device token storage round-trip
 * — Validates: Requirements 4.5.
 *
 * For any issued `Device_Auth_Token` string, storing it in local credential
 * storage and then reading it back returns the identical token. After `clear()`
 * the store reports no token (`null`), and a subsequent `save()` overwrites any
 * previously stored value. The law is exercised against two implementations:
 *
 *   1. A minimal in-memory {@link CredentialStore} mock — the clean contract.
 *   2. {@link FileCredentialStore} backed by an in-memory {@link CredentialFileFs}
 *      Map — the real implementation, so the JSON `{ token }` round-trip
 *      (including escaping of unicode/whitespace/quotes) is covered end to end.
 */

/** A pure in-memory {@link CredentialStore} mock satisfying the round-trip law. */
function mockStore(): CredentialStore {
  let value: string | null = null;
  return {
    async load() {
      return value;
    },
    async save(token: string) {
      value = token;
    },
    async clear() {
      value = null;
    },
  };
}

/** In-memory {@link CredentialFileFs} backed by a Map (mirrors the unit test). */
function memoryFs(): CredentialFileFs {
  const files = new Map<string, string>();
  return {
    async readFile(filePath) {
      const v = files.get(filePath);
      if (v === undefined) throw new Error("ENOENT");
      return v;
    },
    async writeFile(filePath, data) {
      files.set(filePath, data);
    },
    async mkdir() {
      /* no-op */
    },
    async chmod() {
      /* no-op */
    },
    async rm(filePath) {
      files.delete(filePath);
    },
  };
}

/** Factories for the two CredentialStore implementations under test. */
const STORE_FACTORIES: ReadonlyArray<{ name: string; make: () => CredentialStore }> = [
  { name: "in-memory mock store", make: () => mockStore() },
  {
    name: "FileCredentialStore over in-memory fs",
    make: () => new FileCredentialStore({ filePath: "/cfg/credentials.json", fs: memoryFs() }),
  },
];

/**
 * Arbitrary non-empty token strings. `FileCredentialStore.load()` treats an
 * empty stored token as "no token" (returns null), and the auth flow only ever
 * issues non-empty tokens, so we constrain to length >= 1. fast-check's default
 * string generator already covers unicode, whitespace, control chars, quotes,
 * and long values — all of which must survive the JSON round-trip intact.
 */
const tokenArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 200 });

describe("Property 20: device token storage round-trip", () => {
  for (const { name, make } of STORE_FACTORIES) {
    describe(name, () => {
      it("returns the identical token after save → load", async () => {
        await fc.assert(
          fc.asyncProperty(tokenArb, async (token) => {
            const store = make();
            await store.save(token);
            expect(await store.load()).toBe(token);
          }),
          { numRuns: 100 },
        );
      });

      it("returns null after clear, even following a save", async () => {
        await fc.assert(
          fc.asyncProperty(tokenArb, async (token) => {
            const store = make();
            await store.save(token);
            await store.clear();
            expect(await store.load()).toBeNull();
          }),
          { numRuns: 100 },
        );
      });

      it("load reflects the most recently saved token (overwrite)", async () => {
        await fc.assert(
          fc.asyncProperty(tokenArb, tokenArb, async (first, second) => {
            const store = make();
            await store.save(first);
            await store.save(second);
            expect(await store.load()).toBe(second);
          }),
          { numRuns: 100 },
        );
      });
    });
  }
});
