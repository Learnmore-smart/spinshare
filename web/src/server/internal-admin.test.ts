import { describe, expect, it } from "vitest";

import { getInternalAdminEmails, isInternalAdminEmail } from "./internal-admin";

describe("internal-admin", () => {
  const baseEnv = { NODE_ENV: "test" } as NodeJS.ProcessEnv;

  it("defaults to noahzh52@gmail.com", () => {
    expect(getInternalAdminEmails(baseEnv)).toEqual(["noahzh52@gmail.com"]);
    expect(isInternalAdminEmail("noahzh52@gmail.com", baseEnv)).toBe(true);
    expect(isInternalAdminEmail("NOAHZH52@GMAIL.COM", baseEnv)).toBe(true);
  });

  it("reads comma-separated allowlist from env", () => {
    const env = {
      ...baseEnv,
      SPINSHARE_INTERNAL_ADMIN_EMAILS: "a@test.com, B@test.com ",
    };
    expect(getInternalAdminEmails(env)).toEqual(["a@test.com", "b@test.com"]);
    expect(isInternalAdminEmail("b@test.com", env)).toBe(true);
    expect(isInternalAdminEmail("c@test.com", env)).toBe(false);
  });
});
