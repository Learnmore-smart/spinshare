import { describe, expect, test } from "vitest";

import { checkStrictModes } from "./verify-prod-env-core.mjs";

describe("checkStrictModes", () => {
  test("warns (not fails) on localhost NEXTAUTH_URL", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      SPINSHARE_FLUSH_SECRET: "flush_secret",
      NEXTAUTH_URL: "http://localhost:3000",
      AUTH_VERIFICATION_URI: "https://www.spinshare.dev/activate",
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      "NEXTAUTH_URL is localhost - set https://www.spinshare.dev in Cloud Run variables for production",
    );
  });

  test("warns (not fails) on localhost AUTH_VERIFICATION_URI", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      SPINSHARE_FLUSH_SECRET: "flush_secret",
      NEXTAUTH_URL: "https://www.spinshare.dev",
      AUTH_VERIFICATION_URI: "http://localhost:3000/activate",
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      "AUTH_VERIFICATION_URI is localhost - set https://www.spinshare.dev/activate in Cloud Run variables for production",
    );
  });

  test("passes with no warnings when production env is fully configured", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      SPINSHARE_FLUSH_SECRET: "flush_secret",
      NEXTAUTH_URL: "https://www.spinshare.dev",
      AUTH_VERIFICATION_URI: "https://www.spinshare.dev/activate",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-XXXXXXXXXX",
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test("warns when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      SPINSHARE_FLUSH_SECRET: "flush_secret",
      NEXTAUTH_URL: "https://www.spinshare.dev",
      AUTH_VERIFICATION_URI: "https://www.spinshare.dev/activate",
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      "NEXT_PUBLIC_GA_MEASUREMENT_ID is unset - GA4 will be omitted from production Docker builds unless passed as a build arg",
    );
  });

  test("fails when production has no flush trigger secret", () => {
    const result = checkStrictModes({
      SPINSHARE_MODE: "production",
      SPINSHARE_COUNTER: "rtdb",
      AUTH_MODE: "oauth",
      STRIPE_MODE: "test",
      NEXTAUTH_URL: "https://www.spinshare.dev",
      AUTH_VERIFICATION_URI: "https://www.spinshare.dev/activate",
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain(
      "SPINSHARE_FLUSH_SECRET or CRON_SECRET must be set",
    );
  });
});
