# mock-payment-gateway.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Credential-free local/test implementation of the payment gateway port.

## What It Does

- Creates deterministic mock checkout sessions.
- Verifies deterministic HMAC-signed mock webhook payloads.
- Provides test helpers for signed mock Stripe events.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MockPaymentGateway` | Class | Local/test `PaymentGateway` implementation. |

## Dependencies

- Internal: payment gateway port and id generator.
- External: Node `crypto`.

## Important Notes / NEVER Change

- Must remain credential-free.
- Must never call Stripe or the network.
- Mock checkout may simulate immediate settlement, but real Stripe checkout must remain webhook-settled.

## Planned Fix

Bug: homepage public checkout returns `200` locally but the campaign stays hidden after reload.

Cause: mock checkout creates a zero-budget campaign and a fake checkout URL, but no webhook ever credits the campaign budget.

Fix: mark mock checkout sessions as immediately settled and have the public checkout route credit the campaign budget only when the payment gateway returns that explicit marker.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created doc and documented mock settlement fix. | Codex |
