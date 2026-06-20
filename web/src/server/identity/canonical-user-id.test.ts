import { describe, expect, it } from "vitest";

import {
  canonicalUserIdForEmail,
  identityMappingId,
  normalizeIdentityEmail,
} from "./canonical-user-id";

describe("canonical user identity keys", () => {
  it("normalizes email case and surrounding whitespace", () => {
    expect(normalizeIdentityEmail(" Noah@Example.com ")).toBe(
      "noah@example.com",
    );
    expect(canonicalUserIdForEmail(" Noah@Example.com ")).toBe(
      canonicalUserIdForEmail("noah@example.com"),
    );
  });

  it("rejects an empty identity email", () => {
    expect(() => normalizeIdentityEmail("   ")).toThrow(
      "Verified identity email is required",
    );
  });

  it("uses separate mapping keys for separate providers", () => {
    expect(identityMappingId("google", "123")).not.toBe(
      identityMappingId("github", "123"),
    );
  });

  it("does not expose email or provider account ids in document keys", () => {
    const userId = canonicalUserIdForEmail("noah@example.com");
    const mappingId = identityMappingId("google", "account-123");

    expect(userId).toMatch(/^usr_[a-f0-9]{64}$/);
    expect(userId).not.toContain("noah");
    expect(mappingId).toMatch(/^[a-f0-9]{64}$/);
    expect(mappingId).not.toContain("account-123");
  });
});
