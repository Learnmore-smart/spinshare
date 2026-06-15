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

describe("withdrawBalance", () => {
  it("pays out the full balance and debits it to zero", async () => {
    const users = makeUsers(developer({ balanceCents: 1_000 }));
    const payouts: PayoutGateway = new MockPayoutGateway(
      new SequentialIdGenerator(),
    );

    const result = await withdrawBalance({ users, payouts }, DEV);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paidOutCents).toBe(1_000);
      expect(result.payoutId).toMatch(/^po_mock/);
    }
    // Durable balance debited by exactly the amount paid out.
    expect((await users.getById(DEV))?.balanceCents).toBe(0);
  });

  it("rejects a balance below the $5.00 minimum and moves no money", async () => {
    const users = makeUsers(developer({ balanceCents: 499 }));
    const payouts = new SpyPayoutGateway(new SequentialIdGenerator());

    const result = await withdrawBalance({ users, payouts }, DEV);

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: BELOW_MINIMUM_ERROR,
    });
    expect(payouts.payouts).toHaveLength(0);
    expect((await users.getById(DEV))?.balanceCents).toBe(499);
  });

  it("rejects when no connected account exists (409, no money moves)", async () => {
    const users = makeUsers(
      developer({ balanceCents: 5_000, stripeConnectAccountId: undefined }),
    );
    const payouts = new SpyPayoutGateway(new SequentialIdGenerator());

    const result = await withdrawBalance({ users, payouts }, DEV);

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: NOT_CONNECTED_ERROR,
    });
    expect(payouts.payouts).toHaveLength(0);
    expect((await users.getById(DEV))?.balanceCents).toBe(5_000);
  });

  it("rejects when Stripe reports payouts are not enabled (409)", async () => {
    const users = makeUsers(developer({ balanceCents: 5_000 }));
    const payouts = new DisabledPayoutGateway(new SequentialIdGenerator());

    const result = await withdrawBalance({ users, payouts }, DEV);

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: NOT_CONNECTED_ERROR,
    });
    expect((await users.getById(DEV))?.balanceCents).toBe(5_000);
  });
});
