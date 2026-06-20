/** Runs the shared CampaignRepository contract against the in-memory adapter. */

import {
  runCampaignRepositoryContract,
  type CampaignRepositoryContractHarness,
} from "../../ports/__contracts__/campaign-repository.contract";
import { MemoryCampaignRepository } from "./memory-campaign-repository";
import { SequentialIdGenerator } from "./clock";

let counter = 0;

const harness: CampaignRepositoryContractHarness = {
  makeRepo: () => new MemoryCampaignRepository(undefined, new SequentialIdGenerator()),
  uid: (label) => `${label}_${++counter}`,
};

runCampaignRepositoryContract("MemoryCampaignRepository", harness);
