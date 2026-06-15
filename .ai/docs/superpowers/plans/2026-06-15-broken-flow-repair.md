# 2026-06-15-broken-flow-repair.md

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Implementation plan for repairing the broken payout, checkout, market progress, extension auto-wrap, CLI setup, and operator-guide flows.

## What It Does

- Captures the root-cause hypotheses and implementation tasks before code changes.
- Separates mock/local behavior from real Stripe webhook-settled behavior.
- Lists the files and tests used to verify the repair.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Plan markdown | Documentation | Human/agent implementation checklist. |

## Dependencies

- Internal: payment/payout ports, web routes, VS Code extension package.

## Important Notes / NEVER Change

- Do not include real Stripe keys, account ids, webhook secrets, or user tokens.
- Keep the plan aligned with the implementation; update if scope changes.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Marked implementation checklist complete after repo-level verification passed. | Codex |
| 2026-06-15 | Created repair plan before code edits. | Codex |
