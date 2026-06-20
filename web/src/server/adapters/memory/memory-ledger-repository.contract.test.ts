/** Runs the shared LedgerRepository contract against the in-memory adapter. */

import {
  runLedgerRepositoryContract,
  type LedgerRepositoryContractHarness,
} from "../../ports/__contracts__/ledger-repository.contract";
import { MemoryLedgerRepository } from "./memory-ledger-repository";

let counter = 0;

const harness: LedgerRepositoryContractHarness = {
  makeRepo: () => new MemoryLedgerRepository(),
  uid: (label) => `${label}_${++counter}`,
};

runLedgerRepositoryContract("MemoryLedgerRepository", harness);
