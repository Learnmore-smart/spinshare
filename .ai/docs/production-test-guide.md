# production-test-guide.md

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Small operator guide for manually testing CLI ads, payment funding, and end-to-end production readiness.

## What It Does

- Lists commands for automated verification.
- Calls out production-mode flags and the required RTDB URL.
- Points users at the reusable production env verifier.
- Documents that RTDB Management API must be enabled and visible to the deploy/service identity.
- Uses the root `deploy:indexes` script instead of raw Firebase CLI args.
- Calls out that `NEXTAUTH_URL` and `AUTH_VERIFICATION_URI` must use deployed public origins, not localhost.
- Calls out that `STRIPE_MODE` must match the Stripe key prefix.
- Describes how to confirm the CLI displays ads.
- Describes how to test Stripe Checkout and webhook budget crediting.
- Describes how to check health, market, and tracking endpoints.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Markdown guide | documentation | Reader-facing production self-test instructions. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | Documentation file only. |

## Dependencies

- **Internal:** Root package scripts.
- **Internal:** CLI wrapper binary after build.
- **Internal:** Web API routes for health, ad, tracking, checkout, and webhooks.
- **External:** Stripe CLI/Dashboard and Firebase CLI.

## Important Notes / NEVER Change

- Do not include real secrets, tokens, webhook secrets, or account identifiers.
- Keep the guide short and command-oriented.

## Planned Update (2026-06-15)

Clarify:
- Stripe test checkout requires a webhook listener such as `stripe listen --forward-to .../api/webhooks/stripe`.
- The extension auto-wrap affects new integrated terminals after install/sign-in/rebuild.
- CLI login/device approval is the existing `/activate` polling flow.
- Local mock checkout settles immediately; real Stripe checkout is webhook-settled.
- Stripe payout onboarding requires Connect enabled and creates Accounts v2 recipient accounts with Express dashboard access.
- `/api/ad` now requires a bearer device token; production checks should not
  treat anonymous 401 responses as broken bidding.

## Implemented Update (2026-06-15)

Updated the CLI ads and end-to-end check sections so `/api/ad` verification is
explicitly authenticated through the device-flow token.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Documented authenticated `/api/ad` production test expectation. | Codex |
| 2026-06-15 | Added Stripe Connect payout onboarding test section. | Codex |
| 2026-06-15 | Planned Stripe Connect payout onboarding test guidance. | Codex |
| 2026-06-15 | Documented setup-guide/webhook/extension clarification plan. | Codex |
| 2026-06-14 | Created documentation plan for production self-test guide. | Codex |
| 2026-06-14 | Updated guide to use `npx.cmd` on PowerShell, spinner-only CLI frames, and production-mode env flags. | Codex |
| 2026-06-14 | Added `verify:prod-env` guidance. | Codex |
| 2026-06-14 | Added Firebase RTDB API/IAM setup note. | Codex |
| 2026-06-14 | Updated index deploy guidance to use the repo-local wrapper. | Codex |
| 2026-06-14 | Clarified deployed auth URLs, Stripe key mode matching, and built-app e2e command. | Codex |
