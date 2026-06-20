# campaign-repository.contract.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Defines the shared behavioral contract that every campaign repository adapter must satisfy.

## What It Does

- Verifies campaign creation, retrieval, updates, deletion, ownership listing, and bidding eligibility.
- Verifies budget and funding invariants identically for memory and Firestore adapters.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `runCampaignRepositoryContract` | Function | Registers adapter-parity tests for a supplied repository harness. |

## Dependencies

- Internal: campaign repository port.
- External: Vitest.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Add an explicit funding contract: new campaigns start with zero purchased inventory, `applyFunding` increments budget and inventory together, and later spend deltas leave lifetime inventory unchanged.

## Important Notes / NEVER Change

- Keep assertions adapter-neutral; do not depend on Firestore ids or error message wording.
- Money and inventory tests must use integer values.

## Implemented Change 2026-06-20 Market Delivery Progress

Add a failing parity test for atomic campaign funding and cumulative purchased impressions before implementing either adapter.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added campaign funding inventory contract coverage. | Codex |
