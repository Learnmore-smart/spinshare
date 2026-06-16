# verify-local-runtime.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

CLI entrypoint for local external-runtime readiness checks.

## What It Does

- Loads repo `.env` by default, with `--env-file` override.
- Runs dependency/env checks from `verify-local-runtime-core.mjs`.
- Prints PASS/FAIL/WARN lines with next-step details.
- Exits non-zero when hard prerequisites for real verification are missing.
- Current local run correctly reports missing Stripe CLI and Java 8 blocking the
  Firestore emulator.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `node web/scripts/verify-local-runtime.mjs` | CLI | Runs local runtime preflight checks. |
| `--env-file <path>` | option | Loads a dotenv file other than repo root `.env`. |
| `--json` | flag | Emits machine-readable JSON. |

## Important Notes / NEVER Change

- This is a preflight/checklist helper only; it must not start emulators,
  invoke Stripe forwarding, patch Claude settings, or call live providers.
- Keep output actionable for a developer who needs to run real Claude Code,
  Stripe CLI webhook, and Firestore emulator checks.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned local runtime preflight CLI. | Codex |
| 2026-06-15 | Implemented CLI output and verified real-machine failure reporting for Stripe CLI and Java. | Codex |
