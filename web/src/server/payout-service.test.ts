/**
 * Unit tests for the payout service (`withdrawBalance`).
 *
 * Exercises the money-moving cash-out flow against the in-memory user repo and
 * the mock payout gateway:
 *   - success: transfers the full durable balance and debits it to zero;
 *   - `422 below_minimum`: balance under $5.00 → no transfer, balance untouched;
 *   - `409 not_connected`: no connected account, or Stripe reports payouts not
 *     enabled → no transfer, balance untouched.
 */

import { describe, expect, it } from "vitest";
import { type User } from "@spinshare/core";

import {
  MemoryUserRepository,
  MemoryPayoutAttemptRepository,
  MockPayoutGateway,
  SequentialIdGenerator,
} from "./adapters/memory";
import type {
  ConnectAccountStatus,
  PayoutGateway,
  PayoutInput,
  PayoutResult,
} from "./ports";
import {
  BELOW_MINIMUM_ERROR,
  NOT_CONNECTED_ERROR,
  withdrawBalance,
} from "./payout-service";

const DEV = "dev-payout";
const ACCT = "acct_test_123";

function developer(overrides: Partial<User> = {}): User {
  return {
    id: DEV,
    email: "dev@spinshare.test",
    provider: "github",
    role: "developer",
    balanceCents: 1_000,
    stripeConnectAccountId: ACCT,
    payoutsEnabled: true,
    ...overrides,
  };
}

function makeUsers(user: User): MemoryUserRepository {
  const users = new MemoryUserRepository(new SequentialIdGenerator());
  users.seed(user);
  return users;
}

/** A payout gateway whose connected account is NOT cleared for payouts. */
class DisabledPayoutGateway extends MockPayoutGateway {
  override async getAccountStatus(
    accountId: string,
  ): Promise<ConnectAccountStatus> {
    return { accountId, payoutsEnabled: false, detailsSubmitted: false };
  }
}

/** Records payout calls so the test can assert none happened on failure paths. */
class SpyPayoutGateway extends MockPayoutGateway {
  public payouts: PayoutInput[] = [];
  override async createPayout(input: PayoutInput): Promise<PayoutResult> {
    this.payouts.push(input);
    return super.createPayout(input);
  }
}

class DelayedPayoutGateway extends SpyPayoutGateway {
  override async createPayout(input: PayoutInput): Promise<PayoutResult> {
    this.payouts.push(input);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return MockPayoutGateway.prototype.createPayout.call(this, input);
  }
}

describe("withdrawBalance", () => {
  it("pays out the full balance and debits it to zero", async () => {
    const users = makeUsers(developer({ balanceCents: 1_000 }));
    const payouts: PayoutGateway = new MockPayoutGateway(
      new SequentialIdGenerator(),
    );
    const payoutAttempts = new MemoryPayoutAttemptRepository();

    const result = await withdrawBalance(
      {
        users,
        payouts,
        payoutAttempts,
        nowMs: () => 1_700_000_000_000,
        newAttemptId: () => "poa_success",
      },
      DEV,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paidOutCents).toBe(1_000);
      expect(result.payoutId).toMatch(/^po_mock/);
    }
    // Durable balance debited by exactly the amount paid out.
    expect((await users.getById(DEV))?.balanceCents).toBe(0);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual([
      expect.objectContaining({
        attemptId: "poa_success",
        developerId: DEV,
        amountCents: 1_000,
        status: "paid",
        stripeConnectAccountId: ACCT,
        providerEventId: expect.stringMatching(/^po_mock/),
        createdAtMs: 1_700_000_000_000,
        updatedAtMs: 1_700_000_000_000,
      }),
    ]);
  });

  it("rejects a balance below the $5.00 minimum and moves no money", async () => {
    const users = makeUsers(developer({ balanceCents: 499 }));
    const payouts = new SpyPayoutGateway(new SequentialIdGenerator());
    const payoutAttempts = new MemoryPayoutAttemptRepository();

    const result = await withdrawBalance(
      {
        users,
        payouts,
        payoutAttempts,
        nowMs: () => 1_700_000_000_100,
        newAttemptId: () => "poa_minimum",
      },
      DEV,
    );

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: BELOW_MINIMUM_ERROR,
    });
    expect(payouts.payouts).toHaveLength(0);
    expect((await users.getById(DEV))?.balanceCents).toBe(499);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual([
      expect.objectContaining({
        attemptId: "poa_minimum",
        developerId: DEV,
        amountCents: 499,
        status: "blocked",
        providerCode: BELOW_MINIMUM_ERROR,
      }),
    ]);
  });

  it("rejects when no connected account exists (409, no money moves)", async () => {
    const users = makeUsers(
      developer({ balanceCents: 5_000, stripeConnectAccountId: undefined }),
    );
    const payouts = new SpyPayoutGateway(new SequentialIdGenerator());
    const payoutAttempts = new MemoryPayoutAttemptRepository();

    const result = await withdrawBalance(
      {
        users,
        payouts,
        payoutAttempts,
        newAttemptId: () => "poa_no_account",
      },
      DEV,
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: NOT_CONNECTED_ERROR,
    });
    expect(payouts.payouts).toHaveLength(0);
    expect((await users.getById(DEV))?.balanceCents).toBe(5_000);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual([
      expect.objectContaining({
        attemptId: "poa_no_account",
        status: "blocked",
        providerCode: NOT_CONNECTED_ERROR,
      }),
    ]);
  });

  it("rejects when Stripe reports payouts are not enabled (409)", async () => {
    const users = makeUsers(developer({ balanceCents: 5_000 }));
    const payouts = new DisabledPayoutGateway(new SequentialIdGenerator());
    const payoutAttempts = new MemoryPayoutAttemptRepository();

    const result = await withdrawBalance(
      {
        users,
        payouts,
        payoutAttempts,
        newAttemptId: () => "poa_not_enabled",
      },
      DEV,
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: NOT_CONNECTED_ERROR,
    });
    expect((await users.getById(DEV))?.balanceCents).toBe(5_000);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual([
      expect.objectContaining({
        attemptId: "poa_not_enabled",
        status: "blocked",
        amountCents: 5_000,
        providerCode: NOT_CONNECTED_ERROR,
      }),
    ]);
  });

  it("does not double-pay when two withdrawals race for the same balance", async () => {
    const users = makeUsers(developer({ balanceCents: 1_000 }));
    const payouts = new DelayedPayoutGateway(new SequentialIdGenerator());
    const payoutAttempts = new MemoryPayoutAttemptRepository();
    let attempt = 0;

    const [first, second] = await Promise.all([
      withdrawBalance(
        {
          users,
          payouts,
          payoutAttempts,
          newAttemptId: () => `poa_race_${++attempt}`,
        },
        DEV,
      ),
      withdrawBalance(
        {
          users,
          payouts,
          payoutAttempts,
          newAttemptId: () => `poa_race_${++attempt}`,
        },
        DEV,
      ),
    ]);

    expect(payouts.payouts).toHaveLength(1);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect((await users.getById(DEV))?.balanceCents).toBe(0);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "paid" }),
        expect.objectContaining({
          status: "blocked",
          providerCode: "balance_changed",
        }),
      ]),
    );
  });

  it("records a failed payout attempt when the provider transfer throws", async () => {
    class ThrowingPayoutGateway extends SpyPayoutGateway {
      override async createPayout(input: PayoutInput): Promise<PayoutResult> {
        this.payouts.push(input);
        throw Object.assign(new Error("Stripe transfer failed"), {
          requestId: "req_fail_123",
          statusCode: 402,
          code: "balance_insufficient",
        });
      }
    }

    const users = makeUsers(developer({ balanceCents: 1_000 }));
    const payouts = new ThrowingPayoutGateway(new SequentialIdGenerator());
    const payoutAttempts = new MemoryPayoutAttemptRepository();

    await expect(
      withdrawBalance(
        {
          users,
          payouts,
          payoutAttempts,
          nowMs: () => 1_700_000_000_200,
          newAttemptId: () => "poa_failed",
        },
        DEV,
      ),
    ).rejects.toThrow("Stripe transfer failed");

    expect((await users.getById(DEV))?.balanceCents).toBe(1_000);
    expect(await payoutAttempts.listByDeveloper(DEV)).toEqual([
      expect.objectContaining({
        attemptId: "poa_failed",
        developerId: DEV,
        amountCents: 1_000,
        status: "failed",
        stripeConnectAccountId: ACCT,
        providerEventId: "req_fail_123",
        providerStatus: 402,
        providerCode: "balance_insufficient",
      }),
    ]);
  });
});
