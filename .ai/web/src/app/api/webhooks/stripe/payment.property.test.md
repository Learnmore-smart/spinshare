# payment.property.test.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Property-tests exactly-once campaign funding across arbitrary amounts and webhook redeliveries.

## Implemented Change 2026-06-20 Funding Inventory

Generate a positive purchased-impression count for each otherwise-valid funding
event. Assert idempotency still applies to money and cumulative inventory.

## Important Notes / NEVER Change

- Keep arbitrary redelivery counts and idempotency assertions.
- Valid funding fixtures must satisfy the full current Checkout contract.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added exactly-once purchased-inventory property coverage. | Codex |
