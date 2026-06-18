/**
 * Durable payout attempt reconciliation records.
 *
 * These records are separate from user-facing activity rows. They are intended
 * for provider/accounting reconciliation: every withdrawal attempt gets a stable
 * lifecycle state and provider trace metadata.
 */

export type PayoutAttemptStatus = "pending" | "paid" | "failed" | "blocked";

export interface PayoutAttempt {
  attemptId: string;
  developerId: string;
  status: PayoutAttemptStatus;
  createdAtMs: number;
  updatedAtMs: number;
  amountCents?: number;
  stripeConnectAccountId?: string;
  providerEventId?: string;
  providerStatus?: number;
  providerCode?: string;
}

export type PayoutAttemptUpdate = Partial<
  Omit<PayoutAttempt, "attemptId" | "developerId" | "createdAtMs">
>;

export interface PayoutAttemptRepository {
  record(attempt: PayoutAttempt): Promise<void>;
  update(attemptId: string, update: PayoutAttemptUpdate): Promise<void>;
  listByDeveloper(developerId: string): Promise<PayoutAttempt[]>;
}
