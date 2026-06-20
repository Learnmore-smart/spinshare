/**
 * Runs the shared UserRepository contract against the in-memory adapter. This
 * is the always-on baseline (no external deps); the Firestore binding proves
 * the production adapter satisfies the SAME contract when the emulator is up.
 */

import {
  runUserRepositoryContract,
  type UserRepositoryContractHarness,
} from "../../ports/__contracts__/user-repository.contract";
import { MemoryUserRepository } from "./memory-user-repository";
import { SequentialIdGenerator } from "./clock";

let counter = 0;

const harness: UserRepositoryContractHarness = {
  // Fresh empty repo per test → full isolation.
  makeRepo: () => new MemoryUserRepository(new SequentialIdGenerator()),
  uid: (label) => `${label}_${++counter}`,
};

runUserRepositoryContract("MemoryUserRepository", harness);
