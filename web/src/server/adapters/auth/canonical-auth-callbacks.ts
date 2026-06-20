import type { AuthProviderId, UserRole } from "@spinshare/core";
import type { NextAuthConfig } from "next-auth";

import type { UserRepository } from "../../ports/user-repository";
import { resolveVerifiedOAuthEmail } from "./verified-oauth-email";

const CANONICAL_IDENTITY_VERSION = 1;

type AuthCallbacks = NonNullable<NextAuthConfig["callbacks"]>;

export interface CanonicalAuthCallbackDependencies {
  users: () => UserRepository;
  resolveVerifiedEmail?: typeof resolveVerifiedOAuthEmail;
}

function oauthProvider(value: unknown): AuthProviderId | null {
  return value === "google" || value === "github" ? value : null;
}

function userRole(value: unknown): UserRole | undefined {
  return value === "developer" || value === "advertiser" ? value : undefined;
}

/** Creates Auth.js callbacks that persist and expose canonical domain user ids. */
export function createAuthCallbacks({
  users,
  resolveVerifiedEmail = resolveVerifiedOAuthEmail,
}: CanonicalAuthCallbackDependencies): AuthCallbacks {
  return {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "credentials") {
        if (typeof user?.id !== "string" || user.id.length === 0) {
          throw new Error("Credentials user id is required");
        }
        token.sub = user.id;
        token.identityVersion = CANONICAL_IDENTITY_VERSION;
        return token;
      }

      if (account) {
        const provider = oauthProvider(account.provider);
        if (!provider) {
          throw new Error(`Unsupported OAuth provider: ${account.provider}`);
        }
        const email = await resolveVerifiedEmail({
          provider,
          profile:
            typeof profile === "object" && profile !== null
              ? (profile as Record<string, unknown>)
              : {},
          accessToken:
            typeof account.access_token === "string"
              ? account.access_token
              : undefined,
        });
        const canonical = await users().upsertFromIdentity({
          provider,
          providerAccountId: account.providerAccountId,
          email,
          emailVerified: true,
          role: userRole((user as { role?: unknown } | undefined)?.role),
        });
        token.sub = canonical.id;
        token.email = canonical.email;
        token.provider = provider;
        token.identityVersion = CANONICAL_IDENTITY_VERSION;
        return token;
      }

      if (token.identityVersion !== CANONICAL_IDENTITY_VERSION) {
        return null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  };
}
