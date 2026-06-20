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

import type { HeldLot, User } from "@spinshare/core";
import { heldLotBucketMs } from "@spinshare/core";
import type {
  ExternalIdentity,
  UserRepository,
} from "../../ports/user-repository";
import {
  canonicalUserIdForEmail,
  identityMappingId,
  normalizeIdentityEmail,
} from "../../identity/canonical-user-id";
import { RandomIdGenerator, type IdGenerator } from "./clock";

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  /** `${provider}:${providerAccountId}` → user id. */
  private readonly identityIndex = new Map<string, string>();

  constructor(_ids: IdGenerator = new RandomIdGenerator()) {}

  async getById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async upsertFromIdentity(identity: ExternalIdentity): Promise<User> {
    if (identity.emailVerified !== true) {
      throw new Error("Verified identity email is required");
    }
    const email = normalizeIdentityEmail(identity.email);
    const key = identityMappingId(
      identity.provider,
      identity.providerAccountId,
    );
    const existingId = this.identityIndex.get(key);
    if (existingId) {
      const existing = this.users.get(existingId);
      if (existing) {
        // Keep the latest email; role/balance are preserved across sign-ins.
        existing.email = email;
        existing.provider = identity.provider;
        existing.providers = [
          ...new Set([...(existing.providers ?? [existing.provider]), identity.provider]),
        ];
        return { ...existing };
      }
    }

    const id = canonicalUserIdForEmail(email);
    const existing = this.users.get(id);
    const providers = [
      ...new Set([
        ...(existing?.providers ?? (existing ? [existing.provider] : [])),
        identity.provider,
      ]),
    ];
    const user: User = existing
      ? {
          ...existing,
          email,
          provider: identity.provider,
          providers,
        }
      : {
          id,
          email,
          provider: identity.provider,
          providers,
          role: identity.role ?? "developer",
          balanceCents: 0,
          createdAtMs: Date.now(),
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

  async creditHeldEarnings(
    id: string,
    cents: number,
    maturesAtMs: number,
  ): Promise<void> {
    const bucket = heldLotBucketMs(maturesAtMs);
    let user = this.users.get(id);
    if (!user) {
      // Upsert to mirror applyBalanceDeltaCents (no durable record yet).
      user = {
        id,
        email: "",
        provider: "github",
        role: "developer",
        balanceCents: 0,
      };
      this.users.set(id, user);
    }
    user.balanceCents += cents;
    user.heldCents = (user.heldCents ?? 0) + cents;
    const lots = user.heldLots ?? [];
    const existing = lots.find((lot) => lot.maturesAtMs === bucket);
    if (existing) {
      existing.cents += cents;
    } else {
      lots.push({ cents, maturesAtMs: bucket });
    }
    user.heldLots = lots;
  }

  async matureHeldEarnings(id: string, nowMs: number): Promise<number> {
    const user = this.users.get(id);
    if (!user || !user.heldLots || user.heldLots.length === 0) {
      return 0;
    }
    let matured = 0;
    const remaining: HeldLot[] = [];
    for (const lot of user.heldLots) {
      if (lot.maturesAtMs <= nowMs) {
        matured += lot.cents;
      } else {
        remaining.push(lot);
      }
    }
    if (matured === 0) {
      return 0;
    }
    // balanceCents unchanged: matured cents simply move held → available.
    user.heldCents = Math.max(0, (user.heldCents ?? 0) - matured);
    user.heldLots = remaining;
    return matured;
  }

  async voidHeldEarnings(id: string, nowMs: number): Promise<number> {
    const user = this.users.get(id);
    if (!user || !user.heldLots || user.heldLots.length === 0) {
      return 0;
    }
    let voided = 0;
    const remaining: HeldLot[] = [];
    for (const lot of user.heldLots) {
      if (lot.maturesAtMs > nowMs) {
        voided += lot.cents; // still held → claw back
      } else {
        remaining.push(lot); // already matured → survived the window, keep
      }
    }
    if (voided === 0) {
      return 0;
    }
    user.balanceCents -= voided;
    user.heldCents = Math.max(0, (user.heldCents ?? 0) - voided);
    user.heldLots = remaining;
    return voided;
  }

  async tryDebitBalanceCents(
    id: string,
    amountCents: number,
  ): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) {
      return false;
    }
    const availableCents = user.balanceCents - (user.heldCents ?? 0);
    if (availableCents < amountCents) {
      return false;
    }
    user.balanceCents -= amountCents;
    return true;
  }

  async setConnectAccount(
    id: string,
    input: {
      stripeConnectAccountId: string;
      payoutsEnabled: boolean;
      payoutFingerprint?: string;
    },
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
    if (input.payoutFingerprint !== undefined) {
      user.payoutFingerprint = input.payoutFingerprint;
    }
    return { ...user };
  }

  async countAccountsByPayoutFingerprint(fingerprint: string): Promise<number> {
    let count = 0;
    for (const user of this.users.values()) {
      if (user.payoutFingerprint === fingerprint) {
        count += 1;
      }
    }
    return count;
  }

  async listAll(): Promise<User[]> {
    return [...this.users.values()].map((user) => ({ ...user }));
  }

  /** Test/seed helper: inserts a fully-formed user. */
  seed(user: User): void {
    this.users.set(user.id, { ...user });
  }
}
