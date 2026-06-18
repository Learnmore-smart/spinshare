/**
 * Zod validation schemas for SpinShare — the single source of truth for
 * request validation, shared by the web API routes, the dashboards, and the
 * test suites. Pure and I/O-free.
 *
 * Money convention (see design "Money/Ledger Math" and Data Models):
 *   - CPM bids and funding amounts are validated as integer cents.
 *   - Bounds mirror requirements 9.1–9.4, 9.6, 9.7:
 *       cpmCents:      100..100000    ($1.00 .. $1000.00)
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

/** Minimum max-CPM bid in cents, = $1.00. Requirement 9.1, 9.4. */
export const CPM_CENTS_MIN = 100;
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
/** Minimum positive view segment accepted for cumulative progress tracking. */
export const VIEW_SEGMENT_MIN_MS = 1;

export type AdTextSafetyReview =
  | { safe: true }
  | { safe: false; reason: string };

const UNSAFE_AD_TEXT_MESSAGE = "Ad text appears unsafe or deceptive";

const unsafeAdTextPatterns: RegExp[] = [
  /\b(seed phrase|recovery phrase|private key)\b/,
  /\b(enter|type|submit|send|share|provide)\b.{0,40}\b(password|passcode|otp|2fa|mfa|one time code|security code)\b/,
  /\b(claim|free|giveaway|airdrop)\b.{0,40}\b(crypto|bitcoin|btc|ethereum|eth|wallet)\b/,
  /\b(verify|unlock|restore)\b.{0,40}\b(wallet|account|login)\b/,
];

function normalizeAdTextForSafety(text: string): string {
  return text.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, " ");
}

export function reviewAdTextSafety(adText: string): AdTextSafetyReview {
  const normalized = normalizeAdTextForSafety(adText);
  if (unsafeAdTextPatterns.some((pattern) => pattern.test(normalized))) {
    return { safe: false, reason: UNSAFE_AD_TEXT_MESSAGE };
  }
  return { safe: true };
}

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
  })
  .superRefine((text, ctx) => {
    const review = reviewAdTextSafety(text);
    if (!review.safe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: review.reason,
      });
    }
  });

/**
 * Max CPM bid in integer cents: 100..100000 ($1.00..$1000.00).
 * Rejects zero, negative, non-integer (sub-cent), and out-of-range values.
 * Requirement 9.4 (invalid bid) and 9.1 (valid range).
 */
export const cpmCentsSchema = z
  .number({ invalid_type_error: "CPM bid must be a number" })
  .int({ message: "CPM bid must be a whole number of cents" })
  .min(CPM_CENTS_MIN, { message: "CPM bid must be at least $1.00" })
  .max(CPM_CENTS_MAX, { message: "CPM bid must be at most $1000.00" });

function parseIpv4Address(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      return Number.NaN;
    }
    const value = Number(part);
    return value >= 0 && value <= 255 ? value : Number.NaN;
  });

  return octets.some((value) => Number.isNaN(value)) ? null : octets;
}

const URL_SHORTENER_HOSTNAMES = new Set([
  "bit.ly",
  "bitly.com",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "lnkd.in",
  "ow.ly",
  "rb.gy",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tiny.cc",
  "tinyurl.com",
]);

function isPunycodeHostname(hostname: string): boolean {
  return hostname.startsWith("xn--") || hostname.includes(".xn--");
}

function isUrlShortenerHostname(hostname: string): boolean {
  for (const shortener of URL_SHORTENER_HOSTNAMES) {
    if (hostname === shortener || hostname.endsWith(`.${shortener}`)) {
      return true;
    }
  }
  return false;
}

function isUnsafeDestinationUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return true;
  }

  const hostname = url.hostname.toLowerCase();
  if (url.username.length > 0 || url.password.length > 0) {
    return true;
  }
  if (url.port.length > 0) {
    return true;
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return true;
  }
  if (hostname.includes(":") || parseIpv4Address(hostname) !== null) {
    return true;
  }
  if (!hostname.includes(".")) {
    return true;
  }
  if (isPunycodeHostname(hostname)) {
    return true;
  }
  if (isUrlShortenerHostname(hostname)) {
    return true;
  }

  return false;
}

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
  }, { message: "Destination URL must start with https://" })
  .refine((value) => !isUnsafeDestinationUrl(value), {
    message: "Destination URL must use a public HTTPS domain",
  });

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

/** Number of 1,000-view blocks bought in checkout. */
export const advertiserCheckoutBlockCountSchema = z
  .number({ invalid_type_error: "Number of blocks must be a number" })
  .int({ message: "Number of blocks must be a whole number" })
  .min(1, { message: "Buy at least 1 block" })
  .max(ADVERTISER_CHECKOUT_BLOCKS_MAX, {
    message: `Buy at most ${ADVERTISER_CHECKOUT_BLOCKS_MAX} blocks`,
  });

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
  blockCount: advertiserCheckoutBlockCountSchema.optional(),
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

/** Dashboard campaign funding request body: buy 1,000-view blocks. */
export const fundingBlockCheckoutSchema = z.object({
  campaignId: z.string().min(1, { message: "Campaign id is required" }),
  blockCount: advertiserCheckoutBlockCountSchema,
});

/** Validated dashboard block funding payload. */
export type FundingBlockCheckoutInput = z.infer<
  typeof fundingBlockCheckoutSchema
>;

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
 * The body carries the campaign identifier plus one client-observed display
 * segment. Positive segments below 3 seconds are valid progress updates; the
 * backend settles only after cumulative progress reaches `VIEWABILITY_MIN_MS`.
 */
export const trackRequestSchema = z.object({
  campaignId: z.string().min(1, { message: "Campaign id is required" }),
  viewDurationMs: z
    .number({ invalid_type_error: "View duration must be a number" })
    .int({ message: "View duration must be a whole number of milliseconds" })
    .min(VIEW_SEGMENT_MIN_MS, {
      message: "View duration must be positive",
    }),
});

/** Validated track request payload. Matches the `TrackRequest` contract type. */
export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
