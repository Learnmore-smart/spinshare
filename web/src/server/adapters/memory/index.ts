/**
 * Credential-free in-memory / mock adapters for `@spinshare/web`.
 *
 * These implement every provider port without any external service, powering
 * `SPINSHARE_MODE=local` and the test suites. All adapters take an injectable
 * {@link Clock} and {@link IdGenerator} for deterministic time and identifiers;
 * production defaults ({@link SystemClock} + {@link RandomIdGenerator}) are used
 * when none are supplied. See design "Provider Abstraction Layer (Ports)" and
 * "Local Development & Testability Strategy".
 */

export {
  type Clock,
  type IdGenerator,
  SystemClock,
  ManualClock,
  SequentialIdGenerator,
  RandomIdGenerator,
} from "./clock";

export { MemoryCounterStore } from "./memory-counter-store";
export { MemoryCampaignRepository } from "./memory-campaign-repository";
export { MemoryUserRepository } from "./memory-user-repository";
export { MemoryLedgerRepository } from "./memory-ledger-repository";
export { MockPaymentGateway } from "./mock-payment-gateway";
export { MockPayoutGateway } from "./mock-payout-gateway";
export { MemoryPaymentEventStore } from "./memory-payment-event-store";
export { MockAuthProvider } from "./mock-auth-provider";
