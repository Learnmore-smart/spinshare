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
/** Maximum number of 1,000-view blocks in a public checkout form. */
export const ADVERTISER_CHECKOUT_BLOCKS_MAX = 10_000;
/** Maximum email length accepted by the public checkout form. */
export const ADVERTISER_CHECKOUT_EMAIL_MAX_LENGTH = 254;
/** Maximum optional brand name length accepted by the public checkout form. */
export const BRAND_NAME_MAX_LENGTH = 60;
/** Maximum data URL length for an optional small brand icon. */
export const BRAND_ICON_DATA_URL_MAX_LENGTH = 49_152;
/** Minimum ad display duration required before an impression can be tracked. */
export const VIEWABILITY_MIN_MS = 3_000;

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

/** HTTPS destination URL for a campaign's click-through. */
export const destinationUrlSchema = z
  .string()
  .trim()
  .url({ message: "Destination URL must be a valid URL" })
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "Destination URL must start with https://" });

/** Optional public brand name shown on leaderboards / alongside the ad. */
export const brandNameSchema = z
  .string()
  .trim()
  .max(BRAND_NAME_MAX_LENGTH, {
    message: `Brand name must be at most ${BRAND_NAME_MAX_LENGTH} characters`,
  })
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

/** Optional small image data URL for brand icons uploaded from a form. */
export const brandIconDataUrlSchema = z
  .string()
  .trim()
  .max(BRAND_ICON_DATA_URL_MAX_LENGTH, {
    message: "Brand icon must be 64 KB or smaller",
  })
  .refine(
    (value) =>
      /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        value,
      ),
    { message: "Brand icon must be a PNG, JPG, or WebP data URL" },
  )
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

/**
 * Campaign creation input. New campaigns start with a zero budget
 * (enforced by the service, not the client), so budget is not part of
 * this schema. Requirement 9.1.
 *
 * `destinationUrl`, `brandName`, `brandIconDataUrl`, and `publicOnLeaderboard`
 * are optional so the authenticated advertiser dashboard can submit the same
 * rich campaign fields as the public homepage checkout form, while older
 * callers that send only `{ adText, cpmCents }` remain valid.
 */
export const createCampaignSchema = z.object({
  adText: adTextSchema,
  cpmCents: cpmCentsSchema,
  destinationUrl: destinationUrlSchema.optional(),
  brandName: brandNameSchema,
  brandIconDataUrl: brandIconDataUrlSchema,
  publicOnLeaderboard: z.boolean().optional(),
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
// Public advertiser checkout (homepage form)
// ---------------------------------------------------------------------------

/** Contact email for public advertiser checkout. */
export const advertiserEmailSchema = z
  .string()
  .trim()
  .email({ message: "Enter a valid email address" })
  .max(ADVERTISER_CHECKOUT_EMAIL_MAX_LENGTH, {
    message: "Email must be at most 254 characters",
  });

/** HTTPS destination URL, brand name, and brand icon schemas are declared in
 * the campaign-creation section above and reused here. */

/** Number of 1,000-view blocks bought in public checkout. */
export const advertiserCheckoutBlockCountSchema = z
  .number({ invalid_type_error: "Number of blocks must be a number" })
  .int({ message: "Number of blocks must be a whole number" })
  .min(1, { message: "Buy at least 1 block" })
  .max(ADVERTISER_CHECKOUT_BLOCKS_MAX, {
    message: `Buy at most ${ADVERTISER_CHECKOUT_BLOCKS_MAX} blocks`,
  });

/** Public homepage advertiser checkout payload. */
export const advertiserCheckoutSchema = z
  .object({
    email: advertiserEmailSchema,
    adText: adTextSchema,
    destinationUrl: destinationUrlSchema,
    brandName: brandNameSchema,
    brandIconDataUrl: brandIconDataUrlSchema,
    publicOnLeaderboard: z.boolean(),
    cpmCents: cpmCentsSchema,
    blockCount: advertiserCheckoutBlockCountSchema,
  })
  .superRefine((value, ctx) => {
    const amountCents = getAdvertiserCheckoutAmountCents(value);
    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents < FUNDING_CENTS_MIN ||
      amountCents > FUNDING_CENTS_MAX
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockCount"],
        message: "Total checkout amount must be between $1.00 and $100,000.00",
      });
    }
  });

/** Validated public advertiser checkout payload. */
export type AdvertiserCheckoutInput = z.infer<typeof advertiserCheckoutSchema>;

/** Derives total checkout funding from CPM bid and 1,000-view block count. */
export function getAdvertiserCheckoutAmountCents(input: {
  cpmCents: number;
  blockCount: number;
}): number {
  return input.cpmCents * input.blockCount;
}

// ---------------------------------------------------------------------------
// Track request (POST /api/track body)
// ---------------------------------------------------------------------------

/**
 * Impression tracking request body. Auth travels in the Authorization header.
 * The body carries the campaign identifier plus the client-observed display
 * duration; impressions below 3 seconds are invalid and must not settle.
 */
export const trackRequestSchema = z.object({
  campaignId: z.string().min(1, { message: "Campaign id is required" }),
  viewDurationMs: z
    .number({ invalid_type_error: "View duration must be a number" })
    .int({ message: "View duration must be a whole number of milliseconds" })
    .min(VIEWABILITY_MIN_MS, {
      message: "Impressions require at least 3 seconds of view time",
    }),
});

/** Validated track request payload. Matches the `TrackRequest` contract type. */
export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
