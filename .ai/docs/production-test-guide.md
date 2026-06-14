# production-test-guide.md

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Small operator guide for manually testing CLI ads, payment funding, and end-to-end production readiness.

## What It Does

- Lists commands for automated verification.
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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created documentation plan for production self-test guide. | Codex |
