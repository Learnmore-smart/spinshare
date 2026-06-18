/**
 * In-memory {@link UserRepository} — local/test stand-in for the Firestore
 * `users/{userId}` collection.
 *
 * `upsertFromIdentity` resolves a stable user by `(provider, providerAccountId)`;
 * first sign-in creates a `User` (default role `"developer"`, `balanceCents = 0`)
 * with an id from the injected {@link IdGenerator}. The `balanceCents` field is
 * the authoritative durable total; only the flush process mutates it via
 * `applyBalanceDeltaCents`.
 */

import type { User } from "@spinshare/core";
import type {
  ExternalIdentity,
  UserRepository,
} from "../../ports/user-repository";
import { RandomIdGenerator, type IdGenerator } from "./clock";

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  /** `${provider}:${providerAccountId}` → user id. */
  private readonly identityIndex = new Map<string, string>();

  constructor(private readonly ids: IdGenerator = new RandomIdGenerator()) {}

  async getById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async upsertFromIdentity(identity: ExternalIdentity): Promise<User> {
    const key = `${identity.provider}:${identity.providerAccountId}`;
    const existingId = this.identityIndex.get(key);
    if (existingId) {
      const existing = this.users.get(existingId);
      if (existing) {
        // Keep the latest email; role/balance are preserved across sign-ins.
        existing.email = identity.email;
        return { ...existing };
      }
    }

    const user: User = {
      id: this.ids.next("usr"),
      email: identity.email,
      provider: identity.provider,
      role: identity.role ?? "developer",
      balanceCents: 0,
    };
    this.users.set(user.id, user);
    this.identityIndex.set(key, user.id);
    return { ...user };
  }

  async applyBalanceDeltaCents(id: string, deltaCents: number): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      // Upsert to mirror FirestoreUserRepo: a missing durable record is created
      // carrying the credited balance rather than throwing, so a developer who
      // has not yet been provisioned can never poison flush reconciliation.
      // Identity fields are enriched later by `upsertFromIdentity`.
      this.users.set(id, {
        id,
        email: "",
        provider: "github",
        role: "developer",
        balanceCents: deltaCents,
      });
      return;
    }
    user.balanceCents += deltaCents;
  }

  async tryDebitBalanceCents(
    id: string,
    amountCents: number,
  ): Promise<boolean> {
    const user = this.users.get(id);
    if (!user || user.balanceCents < amountCents) {
      return false;
    }
    user.balanceCents -= amountCents;
    return true;
  }

  async setConnectAccount(
    id: string,
    input: { stripeConnectAccountId: string; payoutsEnabled: boolean },
  ): Promise<User> {
    // Upsert: a developer may connect payouts before any durable record exists
    // (e.g. before their first credited impression). Create a minimal record in
    // that case; identity fields are enriched later by `upsertFromIdentity`.
    let user = this.users.get(id);
    if (!user) {
      user = { id, email: "", provider: "github", role: "developer", balanceCents: 0 };
      this.users.set(id, user);
    }
    user.stripeConnectAccountId = input.stripeConnectAccountId;
    user.payoutsEnabled = input.payoutsEnabled;
    return { ...user };
  }

  /** Test/seed helper: inserts a fully-formed user. */
  seed(user: User): void {
    this.users.set(user.id, { ...user });
  }
}
