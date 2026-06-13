/**
 * UserRepository port — durable user storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `users/{userId}` collection. See design "Data Models".
 */

import type { AuthProviderId, User, UserRole } from "@spinshare/core";

/**
 * An identity resolved from an external OAuth provider (Google/GitHub), used to
 * create or update the corresponding `User` on first sign-in. `providerAccountId`
 * is the provider's stable account identifier.
 */
export interface ExternalIdentity {
  /** Identity source. */
  provider: AuthProviderId;
  /** Stable provider-side account id. */
  providerAccountId: string;
  /** Email from the identity provider. */
  email: string;
  /** Role to assign on first creation; defaults applied by the adapter. */
  role?: UserRole;
}

/** Durable user repository. */
export interface UserRepository {
  /** Loads a user by id, or `null` if it does not exist. */
  getById(id: string): Promise<User | null>;
  /** Creates or updates a user from an external identity, returning the user. */
  upsertFromIdentity(identity: ExternalIdentity): Promise<User>;
  /** Applies a signed balance delta (flush reconciliation only). */
  applyBalanceDeltaCents(id: string, deltaCents: number): Promise<void>;
}
