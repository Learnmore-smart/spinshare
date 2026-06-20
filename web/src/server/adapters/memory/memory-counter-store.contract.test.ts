/**
 * Runs the shared CounterStore contract against the in-memory adapter (always-on
 * baseline). Uses the default system clock so clock-sensitive counters behave
 * like the RTDB wall-clock, keeping the contract identical across both.
 */

import {
  runCounterStoreContract,
  type CounterStoreContractHarness,
} from "../../ports/__contracts__/counter-store.contract";
import { MemoryCounterStore } from "./memory-counter-store";

let counter = 0;

const harness: CounterStoreContractHarness = {
  makeStore: () => new MemoryCounterStore(),
  uid: (label) => `${label}_${++counter}`,
};

runCounterStoreContract("MemoryCounterStore", harness);
