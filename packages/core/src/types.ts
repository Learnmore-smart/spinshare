/**
 * Domain types for SpinShare.
 *
 * Pure, I/O-free type declarations shared across the web runtime, the CLI
 * wrapper, the VSCode extension, and the test suites. These mirror the design's
 * Data Models (Firestore collections) and API Contracts.
 *
 * Money convention (see design "Money/Ledger Math"):
 *   - Durable/whole-cent fields are suffixed `*_cents` and stored as integers.
 *   - Sub-cent revenue and retention use micro-cents (1 cent = 1000 micro-cents),
 *     suffixed `*Microcents`, also stored as integers, to stay exact.
 * Floats are never used for money.
 *
 * Timestamps: `@spinshare/core` is pure and does not depend on Firestore, so
 * time is represented as epoch milliseconds (`*Ms`) rather than Firestore
 * `Timestamp`. `createdAtMs` is the deterministic tie-break key for bidding.
 */

// ---------------------------------------------------------------------------
// Enumerated literals
// ---------------------------------------------------------------------------

/** Identity provider a user authenticated through. */
export type AuthProviderId = "google" | "github";

/** Role a user holds within the platform. */
export type UserRole = "developer" | "advertiser";

/** Lifecycle status of a campaign. Biddability also requires budget>0 && cpm>0. */
export type CampaignStatus = "active" | "paused";

/** Safety review status. Only approved campaigns may participate in bidding. */
export type CampaignReviewStatus = "approved" | "pending" | "rejected";

/** Kind of durable ledger record. Impression rows omit `type` for backward compatibility. */
export type LedgerEntryType = "impression" | "signup_bonus";

/** One-time developer sign-up bonus in integer cents ($1.00). */
export const SIGNUP_BONUS_CENTS = 100;

/** Human-readable label stored on signup-bonus ledger rows. */
export const SIGNUP_BONUS_DESCRIPTION = "Early Bird Sign-up Bonus";

/** Deterministic ledger idempotency key for a developer's signup bonus. */
export function signupBonusEntryId(developerId: string): string {
  return `signup_bonus:${developerId}`;
}

// ---------------------------------------------------------------------------
// Firestore-backed domain entities (durable system of record)
// ---------------------------------------------------------------------------

/**
 * A held earnings lot: `cents` credited that mature into withdrawable balance at
 * `maturesAtMs` (epoch millis). Lots are coalesced by maturation bucket so the
 * array stays small even for continuously-earning developers (anti-fraud
 * Tier 3a — earnings hold / clawback).
 */
export interface HeldLot {
  /** Held amount in integer cents. */
  cents: number;
  /** Epoch millis at/after which this lot becomes withdrawable. */
  maturesAtMs: number;
}

/**
 * A platform user. Mirrors `users/{userId}`.
 * `balanceCents` is the accumulated developer earnings (durable total).
 *
 * Earnings-hold split (anti-fraud Tier 3a): `balanceCents` is the *total*; the
 * not-yet-matured (held, clawback-able) portion is `heldCents`, so the
 * withdrawable amount is `balanceCents - (heldCents ?? 0)`. Legacy records
 * predating the split have no `heldCents`/`heldLots` and are treated as fully
 * available (they matured under the prior no-hold regime).
 */
export interface User {
  /** Stable user id (Firestore doc id). */
  id: string;
  /** Email from the identity provider. */
  email: string;
  /** Identity source. */
  provider: AuthProviderId;
  /** All OAuth providers linked to this canonical user. */
  providers?: AuthProviderId[];
  /** Primary role for this user. */
  role: UserRole;
  /** Accumulated developer earnings in integer cents (total = held + available). */
  balanceCents: number;
  /**
   * Not-yet-matured portion of `balanceCents`, in integer cents (anti-fraud
   * Tier 3a). Withdrawable balance is `balanceCents - heldCents`. Absent ⇒ 0
   * (legacy records, or a user whose earnings have all matured).
   */
  heldCents?: number;
  /**
   * The held lots backing `heldCents`, each maturing at its own time. Drained by
   * maturation (oldest-due first) and clawed back by the fraud-scan void path.
   * Absent ⇒ no held earnings.
   */
  heldLots?: HeldLot[];
  /**
   * Account creation time in epoch millis (mirrors the Firestore `createdAt`
   * server timestamp). Surfaced for anti-fraud risk scoring — account age is a
   * core input to progressive-trust / Sybil heuristics. Absent on records
   * written before this field was exposed.
   */
  createdAtMs?: number;
  /**
   * Stripe Connect (Express) account id for developer payouts, set once the
   * developer starts payout onboarding. Absent until they connect.
   */
  stripeConnectAccountId?: string;
  /**
   * Whether the connected account has finished onboarding and is cleared to
   * receive payouts (mirrors Stripe's `payouts_enabled`). Absent/false until
   * onboarding completes.
   */
  payoutsEnabled?: boolean;
  /**
   * Opaque Stripe `external_account.fingerprint` of the connected payout
   * destination (bank/card), captured once onboarding attaches a destination
   * (anti-fraud Tier 3b). NOT raw bank data — a stable hash Stripe uses to
   * recognise the same underlying account. Many distinct platform accounts
   * sharing one fingerprint = a Sybil farm collapsing to a single real payout
   * identity, which the payout-fingerprint dedupe blocks. Absent until known.
   */
  payoutFingerprint?: string;
}

/**
 * An advertiser campaign. Mirrors `campaigns/{campaignId}`.
 * `cpmCents` is the max CPM bid in cents (100..100000 ⇒ $1.00..$1000.00).
 * `budgetCents` is the remaining budget in cents; new campaigns start at 0.
 */
export interface Campaign {
  /** Campaign id (Firestore doc id). */
  id: string;
  /** Owner user id. */
  advertiserId: string;
  /** Advertiser contact email for public checkout-created campaigns. */
  contactEmail?: string;
  /** Ad copy, 1–60 characters. */
  adText: string;
  /** Optional HTTPS destination URL for click-through capable clients. */
  destinationUrl?: string;
  /** Optional advertiser brand name for public market display. */
  brandName?: string;
  /** Optional small brand icon data URL captured from the public checkout form. */
  brandIconDataUrl?: string;
  /** False hides this campaign from the public market leaderboard. */
  publicOnLeaderboard?: boolean;
  /**
   * Safety review state. Missing legacy rows are treated as approved by
   * repository mappers and bidding filters.
   */
  reviewStatus?: CampaignReviewStatus;
  /** Max CPM bid in integer cents. */
  cpmCents: number;
  /** Remaining budget in integer cents. */
  budgetCents: number;
  /** Lifecycle status. */
  status: CampaignStatus;
  /** Epoch millis of creation; deterministic tie-break for bidding. */
  createdAtMs: number;
}

/**
 * A durable record of a single impression and its payout split.
 * Mirrors `ledgerEntries/{entryId}`. `entryId` is the deterministic
 * idempotency key used so reconciliation can never double-count.
 */
export interface LedgerEntry {
  /** Deterministic entry id (idempotency key / Firestore doc id). */
  entryId: string;
  /**
   * Row kind. Absent on legacy impression rows; `signup_bonus` for the one-time
   * $1 welcome credit.
   */
  type?: LedgerEntryType;
  /** Campaign the impression was attributed to (empty for non-impression rows). */
  campaignId: string;
  /** Developer credited for the impression or bonus. */
  developerId: string;
  /** Exact per-impression revenue in micro-cents (0 for signup bonus). */
  revenueMicrocents: number;
  /** Amount credited to the developer in integer cents (rounded). */
  developerCreditCents: number;
  /** Platform retention in micro-cents (revenue − developer credit). */
  spinshareRetentionMicrocents: number;
  /** Signup-bonus credit in integer cents (mirrors `developerCreditCents`). */
  creditCents?: number;
  /** Signup-bonus description shown in activity views. */
  description?: string;
  /** Epoch millis when the impression was durably recorded (optional for legacy rows). */
  createdAtMs?: number;
}

// ---------------------------------------------------------------------------
// Money split (see design "Money/Ledger Math")
// ---------------------------------------------------------------------------

/**
 * Result of splitting one impression's revenue between developer and platform.
 * Invariant: developerCreditCents (in micro-cents) + spinshareRetentionMicrocents
 * === revenueMicrocents, guaranteed because retention is derived by subtraction.
 */
export interface Split {
  /** Exact per-impression revenue in micro-cents. */
  revenueMicrocents: number;
  /** Developer credit in integer cents, 60% rounded half-up to the nearest cent. */
  developerCreditCents: number;
  /** Platform retention in micro-cents, computed by subtraction (exact). */
  spinshareRetentionMicrocents: number;
}

// ---------------------------------------------------------------------------
// API contract: GET /api/ad
// ---------------------------------------------------------------------------

/**
 * Optional inputs for an ad request. Authentication is optional at ad-fetch
 * time (an impression requires auth only at track time).
 */
export interface AdRequest {
  /** Optional bearer token; not required to fetch an ad. */
  token?: string;
}

/** Response when a winning campaign is selected. */
export interface AdResponseAvailable {
  adAvailable: true;
  /** Identifier of the winning campaign. */
  campaignId: string;
  /** Winning campaign ad text. */
  adText: string;
  /**
   * Optional HTTPS click-through destination for the winning campaign. When
   * present, click-capable clients (CLI terminal hyperlink, VSCode "Open"
   * action) make the displayed ad clickable; when absent the ad is shown as
   * plain text. Absent for legacy campaigns created before destination URLs.
   */
  destinationUrl?: string;
  /** Optional advertiser brand name, shown alongside the ad text when present. */
  brandName?: string;
  /** Winning campaign CPM in integer cents (authoritative). */
  cpmCents: number;
  /** Winning campaign CPM formatted as a USD string for display, e.g. "30.00". */
  cpmUsd: string;
  /**
   * Authenticated-only cumulative viewability progress. Present when the
   * developer must continue a previously short view of the same campaign.
   */
  accumulatedViewDurationMs?: number;
  /** Milliseconds still needed before the pending ad can settle. */
  remainingViewDurationMs?: number;
  /**
   * Single-use, HMAC-signed nonce binding this exact ad serve to its later
   * `/api/track` settlement (anti-fraud). The client must echo it back in the
   * track request; the server verifies the signature + campaign/developer match
   * and consumes it once, so a settlement can never occur without a real,
   * unreplayed ad serve. Absent for unauthenticated serves / legacy clients.
   */
  adNonce?: string;
}

/** Response when no candidate campaign is available. */
export interface AdResponseUnavailable {
  adAvailable: false;
}

/** Discriminated union returned by `GET /api/ad`. */
export type AdResponse = AdResponseAvailable | AdResponseUnavailable;

// ---------------------------------------------------------------------------
// API contract: POST /api/track
// ---------------------------------------------------------------------------

/** Request body for `POST /api/track`. */
export interface TrackRequest {
  /** Campaign the impression is attributed to. */
  campaignId: string;
  /** Client-observed ad display duration in milliseconds. */
  viewDurationMs: number;
}

/**
 * Success response for `POST /api/track`. Shadow-banned developers receive an
 * identical shape; the credit reflects the computed value, internal accounting
 * differs (no balance/budget/ledger mutation).
 */
export interface TrackRecordedResponse {
  /** Always true on the success path. */
  recorded: true;
  /** Computed developer credit in integer cents. */
  developerCreditCents: number;
  /** Developer credit formatted as a USD string for display, e.g. "0.18". */
  developerCreditUsd: string;
}

/** Response for a valid short view segment that was stored as progress only. */
export interface TrackProgressResponse {
  /** False until cumulative view duration reaches the viewability floor. */
  recorded: false;
  /** Cumulative view duration stored for this developer/campaign. */
  accumulatedViewDurationMs: number;
  /** Milliseconds still needed before the impression can settle. */
  remainingViewDurationMs: number;
}

export type TrackResponse = TrackRecordedResponse | TrackProgressResponse;
