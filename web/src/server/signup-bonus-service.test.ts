import { describe, expect, it } from "vitest";

import {
  SIGNUP_BONUS_CENTS,
  SIGNUP_BONUS_DESCRIPTION,
  signupBonusEntryId,
} from "@spinshare/core";
import {
  MemoryLedgerRepository,
  MemoryUserRepository,
} from "@/server/adapters/memory";
import {
  buildSignupBonusEntry,
  grantSignupBonus,
} from "@/server/signup-bonus-service";

describe("grantSignupBonus", () => {
  it("credits $1 once and writes a signup_bonus ledger row", async () => {
    const ledger = new MemoryLedgerRepository();
    const users = new MemoryUserRepository();
    const developerId = "google:acct_123";

    const first = await grantSignupBonus({ ledger, users }, developerId);
    expect(first).toEqual({ granted: true });

    const user = await users.getById(developerId);
    expect(user?.balanceCents).toBe(SIGNUP_BONUS_CENTS);

    const entry = await ledger.getByEntryId(signupBonusEntryId(developerId));
    expect(entry).toMatchObject({
      type: "signup_bonus",
      developerId,
      creditCents: SIGNUP_BONUS_CENTS,
      developerCreditCents: SIGNUP_BONUS_CENTS,
      description: SIGNUP_BONUS_DESCRIPTION,
    });

    const second = await grantSignupBonus({ ledger, users }, developerId);
    expect(second).toEqual({ granted: false, reason: "already_granted" });
    expect((await users.getById(developerId))?.balanceCents).toBe(
      SIGNUP_BONUS_CENTS,
    );
    expect((await ledger.listByDeveloper(developerId))).toHaveLength(1);
  });

  it("buildSignupBonusEntry uses a deterministic idempotency key", () => {
    const entry = buildSignupBonusEntry("dev_abc");
    expect(entry.entryId).toBe("signup_bonus:dev_abc");
    expect(entry.type).toBe("signup_bonus");
  });
});
