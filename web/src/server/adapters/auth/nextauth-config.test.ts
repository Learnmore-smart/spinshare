import type { Account, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import { MemoryUserRepository } from "../memory/memory-user-repository";
import { createAuthCallbacks } from "./canonical-auth-callbacks";

interface JwtInput {
  token: JWT;
  account?: Account | null;
  profile?: Profile;
  user?: User;
}

async function runJwt(
  callbacks: ReturnType<typeof createAuthCallbacks>,
  input: JwtInput,
): Promise<JWT | null> {
  const jwt = callbacks.jwt;
  if (!jwt) throw new Error("JWT callback missing");
  return jwt({
    token: input.token,
    account: input.account ?? null,
    profile: input.profile,
    user: input.user ?? ({ id: "ignored" } as User),
    trigger: "signIn",
    isNewUser: false,
  });
}

function oauthAccount(
  provider: "google" | "github",
  providerAccountId: string,
): Account {
  return {
    provider,
    providerAccountId,
    type: provider === "google" ? "oidc" : "oauth",
    access_token: "test-access-token",
  };
}

describe("canonical Auth.js callbacks", () => {
  it("replaces Auth.js's random OAuth user id with the persisted canonical id", async () => {
    const users = new MemoryUserRepository();
    const callbacks = createAuthCallbacks({
      users: () => users,
      resolveVerifiedEmail: async () => "person@example.com",
    });

    const token = await runJwt(callbacks, {
      token: { sub: "random-authjs-uuid", email: "person@example.com" },
      account: oauthAccount("google", "google-123"),
      profile: { email: "person@example.com", email_verified: true },
      user: { id: "random-authjs-uuid", email: "person@example.com" },
    });

    expect(token?.sub).toMatch(/^usr_[a-f0-9]{64}$/);
    expect(token?.sub).not.toBe("random-authjs-uuid");
    expect(token?.identityVersion).toBe(1);
    expect((await users.listAll()).map((user) => user.id)).toEqual([token?.sub]);
  });

  it("uses one canonical id across Google and GitHub sign-ins", async () => {
    const users = new MemoryUserRepository();
    const callbacks = createAuthCallbacks({
      users: () => users,
      resolveVerifiedEmail: async () => "person@example.com",
    });

    const google = await runJwt(callbacks, {
      token: { sub: "google-random" },
      account: oauthAccount("google", "google-123"),
      profile: { email: "person@example.com", email_verified: true },
      user: { id: "google-random", email: "person@example.com" },
    });
    const github = await runJwt(callbacks, {
      token: { sub: "github-random" },
      account: oauthAccount("github", "github-456"),
      profile: { email: "person@example.com" },
      user: { id: "github-random", email: "person@example.com" },
    });

    expect(github?.sub).toBe(google?.sub);
    expect(await users.listAll()).toHaveLength(1);
  });

  it("preserves explicit local credentials ids", async () => {
    const users = new MemoryUserRepository();
    const callbacks = createAuthCallbacks({
      users: () => users,
      resolveVerifiedEmail: async () => {
        throw new Error("OAuth resolver must not run for credentials");
      },
    });

    const token = await runJwt(callbacks, {
      token: { sub: "local-developer" },
      account: {
        provider: "credentials",
        providerAccountId: "local-developer",
        type: "credentials",
      },
      user: { id: "local-developer", email: "developer@spinshare.test" },
    });

    expect(token?.sub).toBe("local-developer");
    expect(token?.identityVersion).toBe(1);
    expect(await users.listAll()).toHaveLength(0);
  });

  it("rejects legacy unversioned JWTs so old UUID docs cannot return", async () => {
    const callbacks = createAuthCallbacks({
      users: () => new MemoryUserRepository(),
      resolveVerifiedEmail: async () => "person@example.com",
    });

    await expect(
      runJwt(callbacks, {
        token: { sub: "6217f46f-6a22-4ae8-94db-db9fce2e948d" },
      }),
    ).resolves.toBeNull();
  });
});
