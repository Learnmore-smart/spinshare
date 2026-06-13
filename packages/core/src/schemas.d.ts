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
/** Minimum ad text length (inclusive). Requirement 9.1, 9.3. */
export declare const AD_TEXT_MIN_LENGTH = 1;
/** Maximum ad text length (inclusive). Requirement 9.1, 9.2. */
export declare const AD_TEXT_MAX_LENGTH = 60;
/** Minimum max-CPM bid in cents, = $0.01. Requirement 9.1, 9.4. */
export declare const CPM_CENTS_MIN = 1;
/** Maximum max-CPM bid in cents, = $1000.00. Requirement 9.1, 9.4. */
export declare const CPM_CENTS_MAX = 100000;
/** Minimum funding amount in cents, = $1.00. Requirement 9.6, 9.7. */
export declare const FUNDING_CENTS_MIN = 100;
/** Maximum funding amount in cents, = $100,000.00. Requirement 9.6, 9.7. */
export declare const FUNDING_CENTS_MAX = 10000000;
/**
 * Ad text: 1–60 characters and not empty/whitespace-only.
 *
 * We validate the trimmed value is non-empty (Requirement 9.3) while enforcing
 * the 1–60 length bound on the original string (Requirement 9.1, 9.2). The
 * length check runs on the raw input so a 60-character limit cannot be bypassed
 * with trailing whitespace.
 */
export declare const adTextSchema: z.ZodEffects<z.ZodString, string, string>;
/**
 * Max CPM bid in integer cents: 1..100000 ($0.01..$1000.00).
 * Rejects zero, negative, non-integer (sub-cent), and out-of-range values.
 * Requirement 9.4 (invalid bid) and 9.1 (valid range).
 */
export declare const cpmCentsSchema: z.ZodNumber;
/**
 * Campaign creation input. New campaigns start with a zero budget
 * (enforced by the service, not the client), so budget is not part of
 * this schema. Requirement 9.1.
 */
export declare const createCampaignSchema: z.ZodObject<{
    adText: z.ZodEffects<z.ZodString, string, string>;
    cpmCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    adText: string;
    cpmCents: number;
}, {
    adText: string;
    cpmCents: number;
}>;
/** Validated campaign creation payload. */
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
/**
 * Funding amount in integer cents: 100..10000000 ($1.00..$100,000.00).
 * Rejects non-numeric, sub-cent (non-integer), below-min, and above-max
 * amounts. Requirement 9.6 (valid range) and 9.7 (invalid amount).
 */
export declare const fundingCentsSchema: z.ZodNumber;
/** "Add Funds" request body. */
export declare const fundingAmountSchema: z.ZodObject<{
    campaignId: z.ZodString;
    amountCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    amountCents: number;
}, {
    campaignId: string;
    amountCents: number;
}>;
/** Validated funding request payload. */
export type FundingAmountInput = z.infer<typeof fundingAmountSchema>;
/**
 * Impression tracking request body. Auth travels in the Authorization header,
 * so the body carries only the campaign identifier.
 */
export declare const trackRequestSchema: z.ZodObject<{
    campaignId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
}, {
    campaignId: string;
}>;
/** Validated track request payload. Matches the `TrackRequest` contract type. */
export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
//# sourceMappingURL=schemas.d.ts.map