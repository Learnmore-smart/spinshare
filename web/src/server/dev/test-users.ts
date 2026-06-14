/**
 * Local test accounts (R4.3 local stand-in).
 *
 * Defines the fixed set of credential-based accounts available for local
 * development and testing. These let a developer sign in with a real
 * email/password against a known identity — replacing the previous "type any
 * id" mock box — and they are the identities the local data seeder
 * (`seed-local-data.ts`) provisions durable data for, so the dashboards show
 * real content immediately after sign-in.
 *
 * Security: these accounts only exist in local/dev mode. The NextAuth
 * Credentials provider is registered exclusively when
 * {@link isLocalCredentialsEnabled} is true (never in `SPINSHARE_MODE=production`),
 * so these credentials can never authenticate against a production deployment.
 */

import type { AuthProviderId, UserRole } from "@spinshare/core";

/** A locally-defined, credential-based test account. */
export interface LocalTestUser {
  /** Stable user id used as the session identity and durable record id. */
  id: string;
  /** Sign-in email. */
  email: string;
  /** Sign-in password (local/dev only — never a real secret). */
  password: string;
  /** Display name. */
  name: string;
  /** Platform role this account holds. */
  role: UserRole;
  /** Identity provider recorded on the seeded durable user. */
  provider: AuthProviderId;
}

/**
 * The fixed local test accounts. Ids are stable so the data seeder and the
 * dashboards (which key off the session user id) stay in sync.
 */
export const LOCAL_TEST_USERS: readonly LocalTestUser[] = [
  {
    id: "local-developer",
    email: "developer@spinshare.test",
    password: "spinshare",
    name: "Dana Developer",
    role: "developer",
    provider: "github",
  },
  {
    id: "local-advertiser",
    email: "advertiser@spinshare.test",
    password: "spinshare",
    name: "Avery Advertiser",
    role: "advertiser",
    provider: "google",
  },
];

/**
 * Whether credential (email/password) sign-in is available. Enabled in every
 * mode except production, so local/CI can authenticate without OAuth creds
 * while production relies solely on Google/GitHub.
 */
export function isLocalCredentialsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === "development") {
    return true;
  }
  return (env.SPINSHARE_MODE ?? "local").toLowerCase() !== "production";
}

/**
 * Resolves a local test account from an email/password pair. Email match is
 * case-insensitive and trimmed; password must match exactly. Returns `null`
 * when no account matches.
 */
export function findLocalTestUser(
  email: string,
  password: string,
): LocalTestUser | null {
  const normalized = email.trim().toLowerCase();
  return (
    LOCAL_TEST_USERS.find(
      (user) => user.email.toLowerCase() === normalized && user.password === password,
    ) ?? null
  );
}
