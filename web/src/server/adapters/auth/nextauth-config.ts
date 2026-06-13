/**
 * NextAuth (Auth.js v5) configuration for browser sessions (R4.3).
 *
 * Powers the web dashboards' Google + GitHub sign-in and, in production, the
 * approval step of the device authorization grant (the user authenticates here,
 * then the device is approved). The config is **credential-tolerant**: each
 * provider is only registered when its client id/secret are present in the
 * environment, so importing this module and building the app never throws when
 * OAuth credentials are absent (local/CI). At request time a provider that was
 * not configured simply isn't offered.
 *
 * Required environment variables (production):
 *   - `AUTH_SECRET`          — session/JWT signing secret (also signs device tokens)
 *   - `GOOGLE_CLIENT_ID`     — Google OAuth client id
 *   - `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
 *   - `GITHUB_ID`            — GitHub OAuth app client id
 *   - `GITHUB_SECRET`        — GitHub OAuth app client secret
 *
 * See design "Browser-Based Auth (`auth-service.ts` + `AuthProvider`)".
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

/**
 * Builds the provider list from the environment. A provider is included only
 * when both of its credentials are set, keeping the build green without creds.
 * We also add a mock Credentials provider for local testing and development.
 */
function buildProviders(
  env: NodeJS.ProcessEnv = process.env,
): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (env.GITHUB_ID && env.GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_ID,
        clientSecret: env.GITHUB_SECRET,
      }),
    );
  }

  // Always register credentials provider to enable mock sign-in locally
  providers.push(
    Credentials({
      id: "credentials",
      name: "Mock Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (credentials && typeof credentials.userId === "string") {
          return {
            id: credentials.userId,
            name: credentials.userId,
            email: `${credentials.userId}@spinshare.test`,
            role: credentials.role,
          };
        }
        return null;
      },
    }),
  );

  return providers;
}

/** The shared Auth.js configuration object. */
export const authConfig: NextAuthConfig = {
  providers: buildProviders(),
  // Stateless JWT sessions: no database adapter needed for this MVP.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    /** Persist the provider account id onto the JWT as our stable user id. */
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.provider = account.provider;
      }
      if (user && typeof user.id === "string") {
        token.sub = user.id;
      } else if (profile && typeof profile.sub === "string") {
        token.sub = profile.sub;
      }
      return token;
    },
    /** Expose the resolved user id + provider on the session object. */
    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        // `id` is not on the default type; attach defensively.
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

/**
 * The NextAuth route handlers + helpers. `handlers` is mounted by
 * `app/api/auth/[...nextauth]/route.ts`; `auth` reads the current session in
 * server components / route handlers.
 *
 * `signIn`/`signOut` are intentionally not re-exported: their inferred types
 * reference `@auth/core` internal provider paths that are not portable across
 * the workspace's declaration emit (TS2742). They can be imported directly from
 * the NextAuth result where needed.
 */
const nextAuth = NextAuth(authConfig);
export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;

