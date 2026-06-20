/**
 * Firestore-backed `UserRepository`.
 *
 * Mirrors `users/{userId}` plus `userIdentities/{identityKey}`.
 * `upsertFromIdentity` transactionally resolves a persistent provider-account
 * mapping, converges first-time providers by normalized verified email, and
 * preserves all financial fields. `applyBalanceDeltaCents` uses an atomic
 * `FieldValue.increment` transaction for flush reconciliation.
 */

import type { HeldLot, User } from "@spinshare/core";
import { heldLotBucketMs } from "@spinshare/core";
import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  ExternalIdentity,
  UserRepository,
} from "../../ports/user-repository";
import {
  canonicalUserIdForEmail,
  identityMappingId,
  normalizeIdentityEmail,
} from "../../identity/canonical-user-id";
import { getFirestoreClient } from "./client";
import { COLLECTIONS, toUser } from "./collections";

/** Options for {@link FirestoreUserRepo}. */
export interface FirestoreUserRepoOptions {
  /** Firestore instance; defaults to the shared client. */
  db?: Firestore;
}

/** Deterministic user document id derived from an external identity. */
export function userIdForIdentity(identity: ExternalIdentity): string {
  return canonicalUserIdForEmail(identity.email);
}

/** Parses the stored `heldLots` field into a fresh, well-typed mutable array. */
function readLots(raw: unknown): HeldLot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const lots: HeldLot[] = [];
  for (const lot of raw) {
    if (
      typeof lot === "object" &&
      lot !== null &&
      typeof (lot as { cents?: unknown }).cents === "number" &&
      typeof (lot as { maturesAtMs?: unknown }).maturesAtMs === "number"
    ) {
      lots.push({
        cents: (lot as HeldLot).cents,
        maturesAtMs: (lot as HeldLot).maturesAtMs,
      });
    }
  }
  return lots;
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
    if (identity.emailVerified !== true) {
      throw new Error("Verified identity email is required");
    }
    const email = normalizeIdentityEmail(identity.email);
    const identityRef = this.db
      .collection(COLLECTIONS.userIdentities)
      .doc(identityMappingId(identity.provider, identity.providerAccountId));
    return this.db.runTransaction(async (tx) => {
      const [identityDoc, emailMatches] = await Promise.all([
        tx.get(identityRef),
        tx.get(this.collection.where("email", "==", email).limit(2)),
      ]);
      if (emailMatches.size > 1) {
        throw new Error("Canonical identity conflict: duplicate verified email");
      }

      const mappedUserId = identityDoc.exists
        ? String(identityDoc.data()?.userId ?? "")
        : "";
      if (identityDoc.exists && mappedUserId.length === 0) {
        throw new Error("Canonical identity conflict: invalid provider mapping");
      }
      const emailUserId = emailMatches.docs[0]?.id ?? "";
      if (
        mappedUserId.length > 0 &&
        emailUserId.length > 0 &&
        mappedUserId !== emailUserId
      ) {
        throw new Error("Canonical identity conflict: provider and email disagree");
      }

      const id =
        mappedUserId || emailUserId || canonicalUserIdForEmail(email);
      const ref = this.collection.doc(id);
      const doc = await tx.get(ref);
      const existing = doc.exists ? (doc.data() ?? {}) : {};
      const providers = [
        ...new Set([
          ...(Array.isArray(existing.providers)
            ? existing.providers.filter(
                (value: unknown) => value === "google" || value === "github",
              )
            : existing.provider === "google" || existing.provider === "github"
              ? [existing.provider]
              : []),
          identity.provider,
        ]),
      ];
      const userData = {
        id,
        email,
        provider: identity.provider,
        providers,
        role: existing.role ?? identity.role ?? "developer",
        balanceCents: Number(existing.balanceCents ?? 0),
        ...(!doc.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(ref, userData, { merge: true });
      tx.set(
        identityRef,
        {
          userId: id,
          provider: identity.provider,
          providerAccountId: identity.providerAccountId,
          email,
          ...(!identityDoc.exists
            ? { createdAt: FieldValue.serverTimestamp() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return toUser(id, { ...existing, ...userData });
    });
  }

  /**
   * Applies a signed balance delta atomically (flush reconciliation only).
   *
   * Upserts: a missing `users/{id}` doc is **created** carrying the delta as its
   * balance rather than throwing. This is critical for reconciliation — under
   * JWT browser sessions no durable user record exists until the first credit
   * reaches here, so throwing `User not found` would abort `runFlushCycle`, nack
   * the batch, and strand every developer's earnings in the RTDB pending queue
   * forever (the dashboard would show $0 while the activity feed shows credits).
   */
  async applyBalanceDeltaCents(id: string, deltaCents: number): Promise<void> {
    const ref = this.collection.doc(id);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        tx.set(ref, {
          balanceCents: deltaCents,
          role: "developer",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      tx.update(ref, {
        balanceCents: FieldValue.increment(deltaCents),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  /**
   * Credits earned revenue into the held bucket (anti-fraud Tier 3a). Read-
   * modify-writes the lots array inside a transaction (coalescing by maturation
   * bucket), and increments both `balanceCents` and `heldCents`. Upserts a
   * missing doc, mirroring {@link applyBalanceDeltaCents}.
   */
  async creditHeldEarnings(
    id: string,
    cents: number,
    maturesAtMs: number,
  ): Promise<void> {
    const bucket = heldLotBucketMs(maturesAtMs);
    const ref = this.collection.doc(id);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.exists ? (doc.data() ?? {}) : {};
      const lots = readLots(data.heldLots);
      const existing = lots.find((lot) => lot.maturesAtMs === bucket);
      if (existing) {
        existing.cents += cents;
      } else {
        lots.push({ cents, maturesAtMs: bucket });
      }
      if (!doc.exists) {
        tx.set(ref, {
          balanceCents: cents,
          heldCents: cents,
          heldLots: lots,
          role: "developer",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      tx.update(ref, {
        balanceCents: FieldValue.increment(cents),
        heldCents: FieldValue.increment(cents),
        heldLots: lots,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  /** Matures due held lots into available balance; returns matured cents. */
  async matureHeldEarnings(id: string, nowMs: number): Promise<number> {
    const ref = this.collection.doc(id);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        return 0;
      }
      const lots = readLots(doc.data()?.heldLots);
      let matured = 0;
      const remaining: HeldLot[] = [];
      for (const lot of lots) {
        if (lot.maturesAtMs <= nowMs) {
          matured += lot.cents;
        } else {
          remaining.push(lot);
        }
      }
      if (matured === 0) {
        return 0;
      }
      tx.update(ref, {
        heldCents: FieldValue.increment(-matured),
        heldLots: remaining,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return matured;
    });
  }

  /** Clawback: voids still-held (un-matured) lots; returns voided cents. */
  async voidHeldEarnings(id: string, nowMs: number): Promise<number> {
    const ref = this.collection.doc(id);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        return 0;
      }
      const lots = readLots(doc.data()?.heldLots);
      let voided = 0;
      const remaining: HeldLot[] = [];
      for (const lot of lots) {
        if (lot.maturesAtMs > nowMs) {
          voided += lot.cents;
        } else {
          remaining.push(lot);
        }
      }
      if (voided === 0) {
        return 0;
      }
      tx.update(ref, {
        balanceCents: FieldValue.increment(-voided),
        heldCents: FieldValue.increment(-voided),
        heldLots: remaining,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return voided;
    });
  }

  /**
   * Atomically reserves funds for a payout against the **available** balance
   * (`balanceCents - heldCents`); never spends held earnings.
   */
  async tryDebitBalanceCents(
    id: string,
    amountCents: number,
  ): Promise<boolean> {
    const ref = this.collection.doc(id);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        return false;
      }
      const balanceCents = Number(doc.data()?.balanceCents ?? 0);
      const heldCents = Number(doc.data()?.heldCents ?? 0);
      if (balanceCents - heldCents < amountCents) {
        return false;
      }
      tx.update(ref, {
        balanceCents: FieldValue.increment(-amountCents),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
  }

  /** Persists the Stripe Connect account id + payout eligibility (upsert). */
  async setConnectAccount(
    id: string,
    input: {
      stripeConnectAccountId: string;
      payoutsEnabled: boolean;
      payoutFingerprint?: string;
    },
  ): Promise<User> {
    const ref = this.collection.doc(id);
    const fingerprintField =
      input.payoutFingerprint !== undefined
        ? { payoutFingerprint: input.payoutFingerprint }
        : {};
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
          ...fingerprintField,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return toUser(id, {
        ...existing,
        stripeConnectAccountId: input.stripeConnectAccountId,
        payoutsEnabled: input.payoutsEnabled,
        ...fingerprintField,
      });
    });
  }

  /** Counts distinct user docs carrying `fingerprint` (Tier 3b dedupe). */
  async countAccountsByPayoutFingerprint(fingerprint: string): Promise<number> {
    const snap = await this.collection
      .where("payoutFingerprint", "==", fingerprint)
      .get();
    return snap.size;
  }

  async listAll(): Promise<User[]> {
    const snap = await this.collection.get();
    return snap.docs.map((doc) => toUser(doc.id, doc.data() ?? {}));
  }
}
