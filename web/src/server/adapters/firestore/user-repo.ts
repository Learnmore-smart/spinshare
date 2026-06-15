/**
 * Firestore-backed `UserRepository`.
 *
 * Mirrors the `users/{userId}` collection. `upsertFromIdentity` is idempotent:
 * the document id is derived deterministically from the external identity
 * (`{provider}:{providerAccountId}`), so repeated sign-ins resolve to the same
 * user. `applyBalanceDeltaCents` uses an atomic `FieldValue.increment` inside a
 * transaction (flush reconciliation only). See design "Data Models".
 */

import type { User } from "@spinshare/core";
import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  ExternalIdentity,
  UserRepository,
} from "../../ports/user-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS, toUser } from "./collections";

/** Options for {@link FirestoreUserRepo}. */
export interface FirestoreUserRepoOptions {
  /** Firestore instance; defaults to the shared client. */
  db?: Firestore;
}

/** Deterministic user document id derived from an external identity. */
export function userIdForIdentity(identity: ExternalIdentity): string {
  return `${identity.provider}:${identity.providerAccountId}`;
}

export class FirestoreUserRepo implements UserRepository {
  private readonly db: Firestore;

  constructor(options: FirestoreUserRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.users);
  }

  async getById(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return toUser(doc.id, doc.data() ?? {});
  }

  /** Creates or updates a user from an external identity, returning the user. */
  async upsertFromIdentity(identity: ExternalIdentity): Promise<User> {
    const id = userIdForIdentity(identity);
    const ref = this.collection.doc(id);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (doc.exists) {
        // Refresh mutable identity fields but preserve durable balance.
        tx.update(ref, {
          email: identity.email,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return toUser(doc.id, { ...doc.data(), email: identity.email });
      }
      const user: User = {
        id,
        email: identity.email,
        provider: identity.provider,
        role: identity.role ?? "developer",
        balanceCents: 0,
      };
      tx.set(ref, {
        ...user,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return user;
    });
  }

  /** Applies a signed balance delta atomically (flush reconciliation only). */
  async applyBalanceDeltaCents(id: string, deltaCents: number): Promise<void> {
    const ref = this.collection.doc(id);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new Error(`User ${id} not found`);
      }
      tx.update(ref, {
        balanceCents: FieldValue.increment(deltaCents),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  /** Persists the Stripe Connect account id + payout eligibility (upsert). */
  async setConnectAccount(
    id: string,
    input: { stripeConnectAccountId: string; payoutsEnabled: boolean },
  ): Promise<User> {
    const ref = this.collection.doc(id);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const existing = doc.exists ? (doc.data() ?? {}) : {};
      // Upsert (merge): a developer may connect payouts before any durable
      // record exists. Seed minimal defaults when absent; preserve everything
      // else (balance, identity) when present.
      tx.set(
        ref,
        {
          ...(doc.exists ? {} : { balanceCents: 0, createdAt: FieldValue.serverTimestamp() }),
          stripeConnectAccountId: input.stripeConnectAccountId,
          payoutsEnabled: input.payoutsEnabled,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return toUser(id, {
        ...existing,
        stripeConnectAccountId: input.stripeConnectAccountId,
        payoutsEnabled: input.payoutsEnabled,
      });
    });
  }
}
