# seed-ad-market.test.mjs

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Tests the deterministic six-campaign production market seed without writing Firestore.

## What It Does

- Verifies campaign ids and the CPM/block/budget money model.
- Verifies validation rejects malformed campaign data.
- Verifies generated Firestore documents contain required serving metadata.
- Verifies production namespace safeguards.

## Dependencies

- Internal: `web/scripts/seed-ad-market.mjs` pure exports.
- External: Vitest.

## Implemented Change 2026-06-20 Purchased Inventory

Assert each generated document persists `blocks * 1,000` as exact cumulative
purchased impressions.

## Important Notes / NEVER Change

- Tests must not connect to Firestore.
- Keep the six deterministic campaign ids stable.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added purchased-inventory seed coverage. | Codex |
