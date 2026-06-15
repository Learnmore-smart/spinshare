/**
 * Provider ports (interfaces) for `@spinshare/web`.
 *
 * Services depend only on these interfaces; the composition root
 * (`container.ts`) binds concrete adapters (in-memory / Firestore emulator /
 * production) selected by configuration. See design "Provider Abstraction
 * Layer (Ports)".
 */

export type {
  CounterStore,
  ApplyImpressionInput,
  ApplyImpressionResult,
  PendingBatch,
} from "./counter-store";

export type { CampaignRepository, NewCampaign } from "./campaign-repository";

export type { UserRepository, ExternalIdentity } from "./user-repository";

export type { LedgerRepository } from "./ledger-repository";

export type {
  PaymentGateway,
  CheckoutInput,
  StripeEvent,
} from "./payment-gateway";

export type {
  PayoutGateway,
  EnsureConnectedAccountInput,
  OnboardingLinkInput,
  ConnectAccountStatus,
  PayoutInput,
  PayoutResult,
} from "./payout-gateway";

export type {
  PaymentEventStore,
  PaymentEventRecord,
} from "./payment-event-store";

export type {
  AuthProvider,
  DeviceFlowHandle,
  DeviceTokenResult,
  AuthClaims,
} from "./auth-provider";
