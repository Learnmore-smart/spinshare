# Payout connect — country handling

## Decision & what shipped (2026-06-17)

**Shipped: US-only, centralized.** Codex's `identity_country_required` fix was
right in root cause but wrong in form (hardcoded `"us"` in v2, `"US"` in the
legacy fallback — two literals that can drift). We collapsed both into a single
`PAYOUT_COUNTRY = "US"` constant in `stripe-payout-gateway.ts`, with a comment
marking US-only as intentional and pointing here for the international seam. No
route/frontend/i18n changes. Verified: gateway tests (6), route tests (3),
`tsc --noEmit` — all pass.

**Deferred: the international picker** (everything below). Research showed the
"keep USD settlement" idea doesn't hold for non-US recipients — they settle in
local currency via Stripe FX, need the recipient service agreement (US uses full
ToS), and self-serve cross-border only reaches US/UK/EEA/CA/CH. Build this when
non-US developers actually need onboarding.

---

## The bug

`POST /api/payouts/connect` → `502 payout_connect_failed`, providerCode
`identity_country_required`.

Codex's root-cause was correct: the Accounts v2 create payload was missing
`identity.country`. Codex's **fix was wrong**: it hardcoded
`identity: { country: "us" }`
([stripe-payout-gateway.ts:115](../../web/src/server/adapters/stripe/stripe-payout-gateway.ts)),
which silently forces every non-US developer into a US account. The legacy
fallback already hardcodes `country: "US"`
([:143](../../web/src/server/adapters/stripe/stripe-payout-gateway.ts)).

## What the Stripe docs actually say (verified 2026-06-17)

Decision taken with the user: **add a country picker, keep USD on the platform
side.** Research corrected the premise of "keep USD settlement":

1. **Self-serve cross-border payouts are region-limited.** A US platform can
   onboard recipients located in the **US, UK, EEA, Canada, and Switzerland**
   only. Outside those → not self-serve (Global Payouts / contact sales). So the
   picker must be restricted to that set, not "any country."
2. **US vs non-US use different agreements.** US connected accounts use the
   **full terms of service** (current default — works today). Non-US recipients
   need the **recipient service agreement** (v1: `tos_acceptance.service_agreement
   = "recipient"`; v2 uses the `configuration.recipient` structure / Dashboard
   Configuration). US accounts do **not** support cross-border payouts.
3. **Non-US recipients settle in their LOCAL currency** (Stripe FX), not USD.
   "Keep USD" only correctly applies to the **platform balance + transfer**
   (`transfers.create` already draws from the USD balance — keep it). Forcing
   `defaults.currency: "usd"` on a non-US account is wrong; the account's default
   currency should be the local one (omit / let Stripe derive). A developer who
   wants USD in a foreign bank opts into multi-currency settlement themselves.
4. Recipient-agreement accounts: transfers take +24h to land, no cross-border
   Instant Payouts, can't request `card_payments` (we don't).

## Open item to resolve during implementation

Exact **Accounts v2** field to attach the recipient service agreement for non-US
recipients (v1 is `tos_acceptance.service_agreement="recipient"`; the v2
`configuration.recipient` shape differs). For Express-dashboard accounts this may
instead be a **platform Dashboard Configuration toggle** ("Transfers → Restricted
Capability Access"), i.e. partly not a code change. Resolve by reading the exact
v2 recipient-creation doc (WebFetch was down during planning) or confirming the
Dashboard setting. Until confirmed, the non-US path is best-effort.

## Plan

1. **Port** `EnsureConnectedAccountInput` — add `country?: string` (ISO alpha-2,
   lowercase; defaults to `"us"`).
2. **Supported-country allowlist** in `@spinshare/core` — `US, CA, GB, CH` + EEA
   members. Shared by route validation and the frontend selector.
3. **Gateway** (`stripe-payout-gateway.ts`):
   - `identity.country` type `"us"` → `string`; use `input.country ?? "us"`.
   - `defaults.currency: "usd"` **only for US**; omit for non-US.
   - Non-US: attach recipient service agreement (open item above).
   - Legacy builder: `country: (input.country ?? "us").toUpperCase()`; add the
     recipient agreement for non-US.
   - `createPayout` transfer currency stays `"usd"` (platform balance) — unchanged.
4. **Route** (`api/payouts/connect/route.ts`) — parse JSON body (tolerate
   empty/invalid), read `country`, validate against the allowlist (400
   `invalid_country` if present-but-unsupported; default `"us"` if absent), pass
   to `ensureConnectedAccount`.
5. **Frontend** (`payout-panel.tsx`) — country `<select>` in the not-connected
   state (default US); POST `{ country }` with `content-type: application/json`.
   Render country names via `Intl.DisplayNames` (no per-country i18n strings).
6. **i18n** — one new label string per locale (`payoutCountryLabel`); country
   names come from `Intl.DisplayNames`.
7. **Tests** — gateway (us default + a non-US case), route (threads body country,
   rejects unsupported, defaults when absent).
8. **`.ai/` mirrors** updated for every changed file.

## Out of scope (explicitly deferred)

- Non-US developers receive **local-currency** payouts (Stripe FX) — expected,
  not a bug.
- Countries outside US/UK/EEA/CA/CH (would need Global Payouts).
- Per-developer multi-currency settlement.
