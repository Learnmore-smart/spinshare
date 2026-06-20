/**
 * Runs the shared ActivityRepository contract against the REAL Firestore adapter
 * under the emulator — the test that actually proves `toActivity` round-trips
 * the anti-fraud (ipHash/uaHash) and money fields identically to memory.
 *
 * Gated on `FIRESTORE_EMULATOR_HOST` (skips in the fast lane), run by the CI
 * `parity` job. See firestore-flush.integration.test.ts for the local recipe.
 */

import {
  runActivityRepositoryContract,
  type ActivityRepositoryContractHarness,
} from "../../ports/__contracts__/activity-repository.contract";
import { FirestoreActivityRepo } from "./activity-repo";
import { getFirestoreClient } from "./client";

const EMULATOR_CONFIGURED = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const runId = `ct_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let counter = 0;

const harness: ActivityRepositoryContractHarness = {
  makeRepo: () => new FirestoreActivityRepo({ db: getFirestoreClient() }),
  uid: (label) => `${runId}_${label}_${++counter}`,
};

runActivityRepositoryContract("FirestoreActivityRepo (emulator)", harness, {
  skip: !EMULATOR_CONFIGURED,
});
