import { describe, expect, it } from "vitest";

import { MONEY_STREAM_ROWS, resolveInitialRole } from "./page";

describe("resolveInitialRole", () => {
  it("uses advertiser when role=advertiser", () => {
    expect(resolveInitialRole(new URLSearchParams("role=advertiser"))).toBe(
      "advertiser",
    );
  });

  it("defaults to developer for missing or invalid roles", () => {
    expect(resolveInitialRole(new URLSearchParams())).toBe("developer");
    expect(resolveInitialRole(new URLSearchParams("role=owner"))).toBe(
      "developer",
    );
  });
});

describe("MONEY_STREAM_ROWS", () => {
  it("fills the sign-in background with alternating moving money rows", () => {
    expect(MONEY_STREAM_ROWS.length).toBeGreaterThanOrEqual(8);

    MONEY_STREAM_ROWS.forEach((row, index) => {
      expect(row.icons.length).toBeGreaterThanOrEqual(12);
      expect(row.icons.every((icon) => icon === "🤑")).toBe(true);

      if (index > 0) {
        const previousRow = MONEY_STREAM_ROWS[index - 1];
        expect(previousRow).toBeDefined();
        if (previousRow) {
          expect(row.direction).not.toBe(previousRow.direction);
        }
      }
    });
  });
});
