/**
 * Pure, framework-free helpers for the advertiser dashboard (task 12.4).
 *
 * These functions hold the dashboard's input logic — parsing dollar strings to
 * integer cents, validating CPM bids and funding amounts against the shared
 * {@link @spinshare/core} bounds, and deriving the live ad-text character state.
 * Keeping them pure (no React, no I/O) makes them unit-testable in isolation and
 * guarantees the client validation uses the *same* bounds the server enforces,
 * so the UI never lets through an amount the API would reject (R9.1, R9.6).
 */

import {
  ADVERTISER_CHECKOUT_BLOCKS_MAX,
  AD_TEXT_MAX_LENGTH,
  type Campaign,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
  formatCentsAsUsd,
  reconstructCampaignDelivery,
} from "@spinshare/core";

export interface CampaignTelemetryView {
  shows: number;
  clicks: number;
  credited: number;
  tooShort: number;
  invalidToken: number;
  invalidCampaign: number;
  shadowBanned: number;
  earningCapped: number;
  duplicate: number;
}

export const ZERO_CAMPAIGN_TELEMETRY: CampaignTelemetryView = {
  shows: 0,
  clicks: 0,
  credited: 0,
  tooShort: 0,
  invalidToken: 0,
  invalidCampaign: 0,
  shadowBanned: 0,
  earningCapped: 0,
  duplicate: 0,
};

/**
 * A {@link Campaign} enriched with the USD display strings the
 * `/api/campaigns` route returns (`cpmUsd`, `remainingBudgetUsd`). This is the
 * exact shape the dashboard receives and renders.
 */
export interface CampaignView extends Campaign {
  /** Max CPM bid formatted as USD, e.g. `"30.00"`. */
  cpmUsd: string;
  /** Remaining budget formatted as USD, e.g. `"125.00"`. */
  remainingBudgetUsd: string;
  /** Aggregate, campaign-scoped telemetry counters. */
  telemetry?: CampaignTelemetryView;
}

/** Result of validating a user-entered dollar amount against a bound. */
export type AmountResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

/** Result of validating a block count input. */
export type BlockCountResult =
  | { ok: true; blocks: number }
  | { ok: false; error: string };

/**
 * Parses a user-entered US dollar string into integer cents, enforcing
 * one-cent precision. Returns `null` when the input is empty, non-numeric, or
 * finer than one cent (more than two decimal places).
 *
 * Accepts plain decimal strings such as `"12"`, `"12.5"`, `"12.34"`. Rejects
 * signs, thousands separators, currency symbols, and sub-cent precision so the
 * parsed value always matches the API's integer-cent expectation (R9.7).
 */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }
  // Whole part, optional fractional part of one or two digits only.
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const [whole, frac = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/**
 * Validates a CPM bid entered in dollars against the core bounds
 * ($1.00–$1,000.00). Returns the integer-cent value on success or a
 * human-readable error describing the violation (R9.1, R9.4).
 */
export function validateCpmDollars(input: string): AmountResult {
  const cents = parseDollarsToCents(input);
  if (cents === null) {
    return {
      ok: false,
      error: "Enter a valid CPM bid in dollars (up to two decimals).",
    };
  }
  if (cents < CPM_CENTS_MIN) {
    return { ok: false, error: "CPM bid must be at least $1.00." };
  }
  if (cents > CPM_CENTS_MAX) {
    return { ok: false, error: "CPM bid must be at most $1,000.00." };
  }
  return { ok: true, cents };
}

/**
 * Validates an "Add Funds" amount entered in dollars against the core bounds
 * ($1.00–$100,000.00). Returns the integer-cent value on success or a
 * human-readable error describing the violation (R9.6, R9.7).
 */
export function validateFundingDollars(input: string): AmountResult {
  const cents = parseDollarsToCents(input);
  if (cents === null) {
    return {
      ok: false,
      error: "Enter a valid amount in dollars (up to two decimals).",
    };
  }
  if (cents < FUNDING_CENTS_MIN) {
    return { ok: false, error: "Amount must be at least $1.00." };
  }
  if (cents > FUNDING_CENTS_MAX) {
    return { ok: false, error: "Amount must be at most $100,000.00." };
  }
  return { ok: true, cents };
}

/**
 * Validates a dashboard funding block count. One block buys 1,000 impressions;
 * the server derives the final checkout amount from the campaign's CPM bid.
 */
export function validateFundingBlocks(input: string): BlockCountResult {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "Enter a whole number of blocks." };
  }
  const blocks = Number(trimmed);
  if (!Number.isSafeInteger(blocks) || blocks < 1) {
    return { ok: false, error: "Buy at least 1 block." };
  }
  if (blocks > ADVERTISER_CHECKOUT_BLOCKS_MAX) {
    return {
      ok: false,
      error: `Buy at most ${ADVERTISER_CHECKOUT_BLOCKS_MAX} blocks.`,
    };
  }
  return { ok: true, blocks };
}

/** Live state of the campaign ad-text input, driving the 60-char counter. */
export interface AdTextState {
  /** Current character count. */
  length: number;
  /** Characters remaining before the 60-char limit (negative if over). */
  remaining: number;
  /** True when the text is empty or only whitespace (R9.3). */
  isEmpty: boolean;
  /** True when the text exceeds the 60-char limit (R9.2). */
  overLimit: boolean;
  /** True when the text is acceptable to submit. */
  valid: boolean;
}

/**
 * Derives the live ad-text state for the builder's character counter and
 * submit gating. The 60-char limit and non-empty rule mirror the core campaign
 * schema (R9.1, R9.2, R9.3).
 */
export function adTextState(text: string): AdTextState {
  const length = text.length;
  const isEmpty = text.trim().length === 0;
  const overLimit = length > AD_TEXT_MAX_LENGTH;
  return {
    length,
    remaining: AD_TEXT_MAX_LENGTH - length,
    isEmpty,
    overLimit,
    valid: !isEmpty && !overLimit,
  };
}

/** Formats integer cents as a `$`-prefixed USD string, e.g. `3000 → "$30.00"`. */
export function formatUsd(cents: number): string {
  return `$${formatCentsAsUsd(cents)}`;
}

export function campaignTelemetry(
  campaign: CampaignView,
): CampaignTelemetryView {
  return { ...ZERO_CAMPAIGN_TELEMETRY, ...(campaign.telemetry ?? {}) };
}

export function sumCampaignTelemetry(
  campaigns: readonly CampaignView[],
): CampaignTelemetryView {
  return campaigns.reduce<CampaignTelemetryView>(
    (total, campaign) => {
      const telemetry = campaignTelemetry(campaign);
      return {
        shows: total.shows + telemetry.shows,
        clicks: total.clicks + telemetry.clicks,
        credited: total.credited + telemetry.credited,
        tooShort: total.tooShort + telemetry.tooShort,
        invalidToken: total.invalidToken + telemetry.invalidToken,
        invalidCampaign: total.invalidCampaign + telemetry.invalidCampaign,
        shadowBanned: total.shadowBanned + telemetry.shadowBanned,
        earningCapped: total.earningCapped + telemetry.earningCapped,
        duplicate: total.duplicate + telemetry.duplicate,
      };
    },
    { ...ZERO_CAMPAIGN_TELEMETRY },
  );
}

export function nonCreditTotal(telemetry: CampaignTelemetryView): number {
  return (
    telemetry.tooShort +
    telemetry.invalidToken +
    telemetry.invalidCampaign +
    telemetry.shadowBanned +
    telemetry.earningCapped +
    telemetry.duplicate
  );
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCtr(clicks: number, shows: number): string {
  if (shows <= 0) {
    return "0.0%";
  }
  return `${((clicks / shows) * 100).toFixed(1)}%`;
}

/**
 * Formats a (possibly fractional) cent amount as USD with sub-cent precision,
 * e.g. `2.5 → "$0.025"`. Ad spend is often a fraction of a cent (one impression
 * at a $5 CPM costs $0.005), so rounding to whole cents — as {@link formatUsd}
 * does — misleads. Defaults to 3 decimals; trailing-zero-free for whole dollars
 * is intentionally NOT done so columns stay aligned.
 */
export function formatUsdPrecise(cents: number, decimals = 3): string {
  return `$${(cents / 100).toFixed(decimals)}`;
}

/**
 * Exact ad spend for a campaign in (fractional) cents: one credited impression
 * costs `cpmCents / 1000`. Kept fractional so totals don't accumulate rounding
 * error before display (paired with {@link formatUsdPrecise}).
 */
export function campaignSpendCents(campaign: CampaignView): number {
  const credited = campaignTelemetry(campaign).credited;
  return (credited * campaign.cpmCents) / 1000;
}

/** Sum of {@link campaignSpendCents} across campaigns, in fractional cents. */
export function totalSpendCents(campaigns: readonly CampaignView[]): number {
  return campaigns.reduce((sum, c) => sum + campaignSpendCents(c), 0);
}

/** Derived, display-only campaign status (the stored `status` is always
 * "active" and never reflects funding or review state). */
export type CampaignDisplayStatus =
  | "active"
  | "unfunded"
  | "needsLink"
  | "paused"
  | "underReview"
  | "rejected";

function hasUsableDestinationUrl(value: string | undefined): boolean {
  if (value === undefined || value.trim().length === 0) {
    return false;
  }
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.port.length === 0 &&
      hostname.includes(".") &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/**
 * Derives the status to show the advertiser. The stored `Campaign.status` is
 * always `"active"` at creation and never flips on funding, so a campaign with
 * no budget would otherwise read as "active" forever. Precedence: rejected >
 * under-review > advertiser-paused > unfunded > needs-link > active.
 */
export function displayStatus(campaign: CampaignView): CampaignDisplayStatus {
  if (campaign.reviewStatus === "rejected") return "rejected";
  if (campaign.reviewStatus === "pending") return "underReview";
  if (campaign.status === "paused") return "paused";
  if (campaign.budgetCents <= 0) return "unfunded";
  return hasUsableDestinationUrl(campaign.destinationUrl) ? "active" : "needsLink";
}

/** True when a campaign has never been funded and has no delivery yet — the
 * card should hide stats and foreground the buy CTA. */
export function isNeverFunded(campaign: CampaignView): boolean {
  const tel = campaignTelemetry(campaign);
  return campaign.budgetCents === 0 && tel.shows === 0 && tel.credited === 0;
}

/**
 * Delivery progress for a campaign's progress bar.
 *
 * Impressions are always purchased in 1,000-view blocks, so the denominator is
 * a multiple of 1,000. Deriving it from the remaining whole-cent budget alone
 * drifts downward (each flush rounds micro-cents → cents, e.g. 1,000 bought
 * reads as 997), so {@link reconstructCampaignDelivery} snaps the raw
 * budget-derived total back onto the 1,000-view block grid. `served` is the
 * credited impression count.
 */
export function deliveryProgress(
  campaign: CampaignView,
  served: number,
): { purchased: number; percent: number } {
  const { purchasedImpressions } = reconstructCampaignDelivery(
    campaign.cpmCents,
    campaign.budgetCents,
    served,
  );
  const purchased = Math.max(purchasedImpressions, served);
  return {
    purchased,
    percent: purchased > 0 ? Math.min(100, (served / purchased) * 100) : 0,
  };
}
