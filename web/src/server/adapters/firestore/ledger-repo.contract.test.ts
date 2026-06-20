/**
 * Runs the shared LedgerRepository contract against the REAL Firestore adapter
 * under the emulator (proves idempotency-by-entryId + money-field round-trip).
 * Gated on `FIRESTORE_EMULATOR_HOST`; run by the CI `parity` job.
 */

import {
  runLedgerRepositoryContract,
  type LedgerRepositoryContractHarness,
} from "../../ports/__contracts__/ledger-repository.contract";
import { FirestoreLedgerRepo } from "./ledger-repo";
import { getFirestoreClient } from "./client";

const EMULATOR_CONFIGURED = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const runId = `ct_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let counter = 0;

const harness: LedgerRepositoryContractHarness = {
  makeRepo: () => new FirestoreLedgerRepo({ db: getFirestoreClient() }),
  uid: (label) => `${runId}_${label}_${++counter}`,
};

runLedgerRepositoryContract("FirestoreLedgerRepo (emulator)", harness, {
  skip: !EMULATOR_CONFIGURED,
});
