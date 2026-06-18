/**
 * Firestore adapters barrel.
 *
 * Concrete `CampaignRepository`, `UserRepository`, and `LedgerRepository`
 * implementations backed by the Firebase Admin SDK. Honor
 * `FIRESTORE_EMULATOR_HOST` for credential-free local development; the same
 * client drives production Firestore. Wired at the composition root
 * (`container.ts`). See design "Provider Abstraction Layer (Ports)".
 */

export { getFirestoreClient, isUsingEmulator } from "./client";
export { COLLECTIONS } from "./collections";
export {
  FirestoreCampaignRepo,
  type FirestoreCampaignRepoOptions,
} from "./campaign-repo";
export {
  FirestoreUserRepo,
  userIdForIdentity,
  type FirestoreUserRepoOptions,
} from "./user-repo";
export {
  FirestoreLedgerRepo,
  type FirestoreLedgerRepoOptions,
} from "./ledger-repo";
export {
  FirestoreActivityRepo,
  type FirestoreActivityRepoOptions,
} from "./activity-repo";
export {
  FirestoreImpressionProgressRepo,
  type FirestoreImpressionProgressRepoOptions,
} from "./impression-progress-repo";
export {
  FirestorePaymentEventStore,
  type FirestorePaymentEventStoreOptions,
} from "./payment-event-store";
export {
  FirestorePayoutAttemptRepo,
  type FirestorePayoutAttemptRepoOptions,
} from "./payout-attempt-repo";
