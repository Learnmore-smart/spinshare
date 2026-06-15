# stripe-payout-gateway.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for Stripe payout gateway request construction.

## What It Does

- Verifies connected account creation uses explicit controller properties for Express onboarding.
- Verifies the gateway avoids legacy account `type` in new account create params.
- Verifies transfer and onboarding calls keep using the narrow payout port contract.

## Dependencies

- Internal: `stripe-payout-gateway.ts`.
- External: Vitest.

## Planned Test

Add red coverage for controller-based connected account creation before changing the production gateway.

## Planned Accounts v2 Test Update

Change the request-shape test to require Accounts v2 recipient configuration, `dashboard = "express"`, and no legacy `type`, `capabilities.transfers`, or `controller` payload.

## Implemented Test Coverage

- Locks the Accounts v2 recipient payload shape.
- Verifies `createConnectedAccount` posts to `/v2/core/accounts` with the pinned Stripe API version and serialized payload.
- Verifies the payload excludes unsupported legacy/v1 fields and unsupported Accounts v2 create metadata.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added assertion that Accounts v2 create payload excludes metadata. | Codex |
| 2026-06-15 | Planned assertion that Accounts v2 create payload excludes metadata. | Codex |
| 2026-06-15 | Added Accounts v2 raw request test coverage. | Codex |
| 2026-06-15 | Update payout gateway tests to lock the Accounts v2 recipient payload. | Codex |
| 2026-06-15 | Created doc for payout gateway tests. | Codex |
