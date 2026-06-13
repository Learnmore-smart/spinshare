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
 * ($0.01–$1,000.00). Returns the integer-cent value on success or a
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
    return { ok: false, error: "CPM bid must be at least $0.01." };
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
