/**
 * Runs the shared CounterStore contract against the REAL RTDB adapter under the
 * Firebase Realtime Database emulator — proves the production hot-path store
 * satisfies the same money / idempotency / drain-ack-nack / replay contract as
 * the in-memory one.
 *
 * Gated on `FIREBASE_DATABASE_EMULATOR_HOST` (set by `firebase emulators:exec
 * --only database`); skips in the fast lane and the Firestore-only parity job.
 * Run by the dedicated CI `parity-rtdb` job. Each `makeStore` gets a unique
 * rootPath so cases are isolated within the shared emulator tree.
 */

import {
  runCounterStoreContract,
  type CounterStoreContractHarness,
} from "../../ports/__contracts__/counter-store.contract";
import { RealtimeDbCounterStore, getRealtimeDb } from "./index";

const EMULATOR_CONFIGURED = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);

const runId = `ct_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let storeSeq = 0;
let uidSeq = 0;

const harness: CounterStoreContractHarness = {
  // A fresh isolated subtree per store, so cases never collide in the shared
  // emulator database. getRealtimeDb() is only reached when not skipped.
  makeStore: () =>
    new RealtimeDbCounterStore({
      db: getRealtimeDb(),
      rootPath: `contract/${runId}/${++storeSeq}`,
    }),
  uid: (label) => `${label}_${++uidSeq}`,
};

runCounterStoreContract("RealtimeDbCounterStore (emulator)", harness, {
  skip: !EMULATOR_CONFIGURED,
});
