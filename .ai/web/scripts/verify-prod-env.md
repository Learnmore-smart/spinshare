# verify-prod-env.mjs

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Reusable production environment verifier for SpinShare live provider configuration.

## What It Does

- Loads `.env` without printing secret values.
- Checks required Firebase, Stripe, Google OAuth, GitHub OAuth, and Auth.js variables.
- In strict mode, enforces production runtime flags (`production`, `rtdb`, `oauth`, `test|live` Stripe).
- Performs read-only live probes against Firestore, RTDB, Stripe, GitHub OAuth, and Google OAuth.
- Checks RTDB Management API visibility with the Firebase service-account identity.
- Verifies Firestore index config files exist and parse.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `node web/scripts/verify-prod-env.mjs` | CLI | Runs read-only env/provider checks. |
| `--strict-production` | flag | Treats non-production mode flags and missing RTDB URL as failures. |
| `--json` | flag | Emits machine-readable JSON. |
| `--env-file <path>` | option | Uses a dotenv file other than repo-root `.env`. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `.env` | dotenv file | Yes | Source of local production/test secrets unless overridden by process env. |

## Dependencies

- **External:** `firebase-admin` - Firestore and RTDB read-only probes.
- **External:** `stripe` - balance retrieval probe.
- **External:** Node `fetch` - OAuth and Google API endpoint probes.
- **External:** Node `crypto` - service-account JWT signing for Google API probes.
- **Internal:** `firebase.json` and `firestore.indexes.json` - Firestore deployment config validation.
- **Internal:** `verify-prod-env-core.mjs` - import-safe strict-mode validation helpers.

## Important Notes / NEVER Change

- Never print raw secret values.
- Probes must be read-only; this script should not mutate Firestore, RTDB, Stripe, or OAuth provider state.
- Strict mode should fail when the current env is still local/mock, because that is not production-ready.
- Strict mode must reject local-only auth URLs, including `NEXTAUTH_URL` and an explicit `AUTH_VERIFICATION_URI` override.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Move strict-mode validation into `verify-prod-env-core.mjs` so the CLI and tests share dependency-free logic. | Codex |
| 2026-06-15 | Replace corrupted localhost warning text with ASCII strings so the ESM script parses consistently in Vitest. | Codex |
| 2026-06-14 | Created production env verifier design. | Codex |
| 2026-06-14 | Added RTDB Management API visibility check for clearer Firebase setup/IAM diagnosis. | Codex |
| 2026-06-14 | Exported import-safe strict-mode helper and added localhost `AUTH_VERIFICATION_URI` validation. | Codex |
