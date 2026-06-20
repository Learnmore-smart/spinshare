/**
 * Runs the shared ActivityRepository contract against the in-memory adapter
 * (always-on baseline). The Firestore binding proves the production mapper
 * satisfies the SAME contract under the emulator.
 */

import {
  runActivityRepositoryContract,
  type ActivityRepositoryContractHarness,
} from "../../ports/__contracts__/activity-repository.contract";
import { MemoryActivityRepository } from "./memory-activity-repository";

let counter = 0;

const harness: ActivityRepositoryContractHarness = {
  makeRepo: () => new MemoryActivityRepository(),
  uid: (label) => `${label}_${++counter}`,
};

runActivityRepositoryContract("MemoryActivityRepository", harness);
