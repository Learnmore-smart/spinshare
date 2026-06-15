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
  AD_TEXT_MAX_LENGTH,
  type Campaign,
  CPM_CENTS_MAX,
  CPM_CENTS_MIN,
  FUNDING_CENTS_MAX,
  FUNDING_CENTS_MIN,
  formatCentsAsUsd,
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
