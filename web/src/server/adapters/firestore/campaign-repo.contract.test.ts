/**
 * Runs the shared CampaignRepository contract against the REAL Firestore adapter
 * under the emulator (proves budget deltas + the biddable predicate match
 * memory). Gated on `FIRESTORE_EMULATOR_HOST`; run by the CI `parity` job.
 */

import {
  runCampaignRepositoryContract,
  type CampaignRepositoryContractHarness,
} from "../../ports/__contracts__/campaign-repository.contract";
import { FirestoreCampaignRepo } from "./campaign-repo";
import { getFirestoreClient } from "./client";

const EMULATOR_CONFIGURED = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const runId = `ct_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let counter = 0;

const harness: CampaignRepositoryContractHarness = {
  makeRepo: () => new FirestoreCampaignRepo({ db: getFirestoreClient() }),
  uid: (label) => `${runId}_${label}_${++counter}`,
};

runCampaignRepositoryContract("FirestoreCampaignRepo (emulator)", harness, {
  skip: !EMULATOR_CONFIGURED,
});
