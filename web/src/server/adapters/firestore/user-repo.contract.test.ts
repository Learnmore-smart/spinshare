/**
 * Runs the shared UserRepository contract against the REAL Firestore adapter,
 * driven by the emulator. This is what actually closes the parity gap: it
 * proves FirestoreUserRepo satisfies the exact same money-invariant contract the
 * in-memory adapter does (held/available accounting, lot maturation/clawback,
 * available-aware debit, fingerprint dedupe).
 *
 * Gated on `FIRESTORE_EMULATOR_HOST` and SKIPPED when unset (CI fast lane / this
 * environment), exactly like `firestore-flush.integration.test.ts`. To run it:
 *   corepack pnpm@9.12.0 emulators            # start the Firestore emulator
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 corepack pnpm@9.12.0 --filter @spinshare/web test
 *
 * Isolation: all cases share the emulator `users` collection, so every user id
 * is namespaced with a per-run prefix + counter so cases never collide.
 */

import {
  runUserRepositoryContract,
  type UserRepositoryContractHarness,
} from "../../ports/__contracts__/user-repository.contract";
import { FirestoreUserRepo } from "./user-repo";
import { getFirestoreClient } from "./client";

const EMULATOR_CONFIGURED = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// Per-run namespace so repeated/parallel runs never collide.
const runId = `ct_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let counter = 0;

const harness: UserRepositoryContractHarness = {
  // The repo is stateless over the collection; isolation comes from unique ids.
  makeRepo: () => new FirestoreUserRepo({ db: getFirestoreClient() }),
  uid: (label) => `${runId}_${label}_${++counter}`,
};

runUserRepositoryContract("FirestoreUserRepo (emulator)", harness, {
  skip: !EMULATOR_CONFIGURED,
});
