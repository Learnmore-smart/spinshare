import { describe, expect, test } from "vitest";

import { checkStrictModes } from "./verify-prod-env.mjs";

describe("checkStrictModes", () => {
  test("rejects localhost device verification URI overrides", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      NEXTAUTH_URL: "https://app.example.com",
      AUTH_VERIFICATION_URI: "http://localhost:3000/activate",
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain(
      "AUTH_VERIFICATION_URI must not be localhost for production",
    );
  });
});
