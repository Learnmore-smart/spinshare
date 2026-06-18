import type {
  PayoutAttempt,
  PayoutAttemptRepository,
  PayoutAttemptUpdate,
} from "../../ports/payout-attempt-repository";

export class MemoryPayoutAttemptRepository
  implements PayoutAttemptRepository
{
  private readonly attempts = new Map<string, PayoutAttempt>();

  async record(attempt: PayoutAttempt): Promise<void> {
    if (!this.attempts.has(attempt.attemptId)) {
      this.attempts.set(attempt.attemptId, { ...attempt });
    }
  }

  async update(
    attemptId: string,
    update: PayoutAttemptUpdate,
  ): Promise<void> {
    const existing = this.attempts.get(attemptId);
    if (!existing) {
      return;
    }
    this.attempts.set(attemptId, { ...existing, ...update });
  }

  async listByDeveloper(developerId: string): Promise<PayoutAttempt[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.developerId === developerId)
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((attempt) => ({ ...attempt }));
  }
}
