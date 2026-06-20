import { describe, expect, it } from "vitest";

import type { LedgerActivityRow } from "./summarize-ledger";
import { welcomeGiftActivityFromRows } from "./welcome-gift-activity";

function bonusRow(createdAtMs?: number): LedgerActivityRow {
  return {
    entryId: "signup_bonus:dev1",
    ledgerType: "signup_bonus",
    sequence: 1,
    campaignId: "",
    developerCreditCents: 100,
    developerCreditUsd: "1.00",
    developerCreditDisplayMicrocents: 100_000,
    developerCreditDisplayUsd: "1.00",
    ...(createdAtMs === undefined ? {} : { createdAtMs }),
  };
}

describe("welcomeGiftActivityFromRows", () => {
  it("adapts the durable bonus row into one pinned activity source", () => {
    expect(welcomeGiftActivityFromRows([bonusRow(1234)])).toEqual({
      activityId: "signup_bonus:dev1",
      campaignId: "—",
      type: "welcome_gift",
      status: "credited",
      amountCents: 100,
      amountUsd: "1.00",
      createdAtMs: 1234,
    });
  });

  it("does not fabricate a timestamp for a legacy bonus row", () => {
    expect(welcomeGiftActivityFromRows([bonusRow()])).toBeUndefined();
  });
});
