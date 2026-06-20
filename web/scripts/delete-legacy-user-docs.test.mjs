import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGACY_USER_IDS,
  deleteLegacyUserDocs,
} from "./delete-legacy-user-docs.mjs";

function fakeFirestore(existingIds) {
  const existing = new Set(existingIds);
  const deleted = [];
  return {
    deleted,
    collection(name) {
      assert.equal(name, "users");
      return {
        doc(id) {
          return {
            id,
            async delete() {
              deleted.push(id);
              existing.delete(id);
            },
            async get() {
              return { exists: existing.has(id) };
            },
          };
        },
      };
    },
  };
}

test("cleanup is restricted to the two authorized UUID documents", () => {
  assert.deepEqual(LEGACY_USER_IDS, [
    "6217f46f-6a22-4ae8-94db-db9fce2e948d",
    "fa8e2f7e-6365-443b-ad45-10dcf4d24761",
  ]);
});

test("dry-run performs no deletes", async () => {
  const db = fakeFirestore(LEGACY_USER_IDS);
  const result = await deleteLegacyUserDocs(db, { confirm: false });

  assert.deepEqual(db.deleted, []);
  assert.deepEqual(result, { deleted: [], remaining: [...LEGACY_USER_IDS] });
});

test("confirmed cleanup deletes and verifies both documents", async () => {
  const db = fakeFirestore(LEGACY_USER_IDS);
  const result = await deleteLegacyUserDocs(db, { confirm: true });

  assert.deepEqual(db.deleted, LEGACY_USER_IDS);
  assert.deepEqual(result, { deleted: [...LEGACY_USER_IDS], remaining: [] });
});
