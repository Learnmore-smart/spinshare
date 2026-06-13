/**
 * Zod validation schemas for SpinShare — the single source of truth for
 * request validation, shared by the web API routes, the dashboards, and the
 * test suites. Pure and I/O-free.
 *
 * Money convention (see design "Money/Ledger Math" and Data Models):
 *   - CPM bids and funding amounts are validated as integer cents.
 *   - Bounds mirror requirements 9.1–9.4, 9.6, 9.7:
 *       cpmCents:      1..100000      ($0.01 .. $1000.00)
 *       fundingCents:  100..10000000  ($1.00  .. $100,000.00)
 *   - "One-cent precision" means amounts must be whole integers (no sub-cent
 *     fractions); non-integer values are rejected.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared bound constants (exported for reuse by UI and tests)
// ---------------------------------------------------------------------------

/** Minimum ad text length (inclusive). Requirement 9.1, 9.3. */
export const AD_TEXT_MIN_LENGTH = 1;
/** Maximum ad text length (inclusive). Requirement 9.1, 9.2. */
export const AD_TEXT_MAX_LENGTH = 60;

/** Minimum max-CPM bid in cents, = $0.01. Requirement 9.1, 9.4. */
export const CPM_CENTS_MIN = 1;
/** Maximum max-CPM bid in cents, = $1000.00. Requirement 9.1, 9.4. */
export const CPM_CENTS_MAX = 100_000;

/** Minimum funding amount in cents, = $1.00. Requirement 9.6, 9.7. */
export const FUNDING_CENTS_MIN = 100;
/** Maximum funding amount in cents, = $100,000.00. Requirement 9.6, 9.7. */
export const FUNDING_CENTS_MAX = 10_000_000;

// ---------------------------------------------------------------------------
// Campaign creation (Requirements 9.1, 9.2, 9.3, 9.4)
// ---------------------------------------------------------------------------

/**
 * Ad text: 1–60 characters and not empty/whitespace-only.
 *
 * We validate the trimmed value is non-empty (Requirement 9.3) while enforcing
 * the 1–60 length bound on the original string (Requirement 9.1, 9.2). The
 * length check runs on the raw input so a 60-character limit cannot be bypassed
 * with trailing whitespace.
 */
export const adTextSchema = z
  .string()
  .min(AD_TEXT_MIN_LENGTH, { message: "Ad text is required" })
  .max(AD_TEXT_MAX_LENGTH, {
    message: `Ad text must be at most ${AD_TEXT_MAX_LENGTH} characters`,
  })
  .refine((text) => text.trim().length > 0, {
    message: "Ad text is required",
  });

/**
 * Max CPM bid in integer cents: 1..100000 ($0.01..$1000.00).
 * Rejects zero, negative, non-integer (sub-cent), and out-of-range values.
 * Requirement 9.4 (invalid bid) and 9.1 (valid range).
 */
export const cpmCentsSchema = z
  .number({ invalid_type_error: "CPM bid must be a number" })
  .int({ message: "CPM bid must be a whole number of cents" })
  .min(CPM_CENTS_MIN, { message: "CPM bid must be at least $0.01" })
  .max(CPM_CENTS_MAX, { message: "CPM bid must be at most $1000.00" });

/**
 * Campaign creation input. New campaigns start with a zero budget
 * (enforced by the service, not the client), so budget is not part of
 * this schema. Requirement 9.1.
 */
export const createCampaignSchema = z.object({
  adText: adTextSchema,
  cpmCents: cpmCentsSchema,
});

/** Validated campaign creation payload. */
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// ---------------------------------------------------------------------------
// Funding amount (Requirements 9.6, 9.7)
// ---------------------------------------------------------------------------

/**
 * Funding amount in integer cents: 100..10000000 ($1.00..$100,000.00).
 * Rejects non-numeric, sub-cent (non-integer), below-min, and above-max
 * amounts. Requirement 9.6 (valid range) and 9.7 (invalid amount).
 */
export const fundingCentsSchema = z
  .number({ invalid_type_error: "Funding amount must be a number" })
  .int({ message: "Funding amount must be a whole number of cents" })
  .min(FUNDING_CENTS_MIN, { message: "Funding amount must be at least $1.00" })
  .max(FUNDING_CENTS_MAX, {
    message: "Funding amount must be at most $100,000.00",
  });

/** "Add Funds" request body. */
export const fundingAmountSchema = z.object({
  campaignId: z.string().min(1, { message: "Campaign id is required" }),
  amountCents: fundingCentsSchema,
});

/** Validated funding request payload. */
export type FundingAmountInput = z.infer<typeof fundingAmountSchema>;

// ---------------------------------------------------------------------------
// Track request (POST /api/track body)
// ---------------------------------------------------------------------------

/**
 * Impression tracking request body. Auth travels in the Authorization header,
 * so the body carries only the campaign identifier.
 */
export const trackRequestSchema = z.object({
  campaignId: z.string().min(1, { message: "Campaign id is required" }),
});

/** Validated track request payload. Matches the `TrackRequest` contract type. */
export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
