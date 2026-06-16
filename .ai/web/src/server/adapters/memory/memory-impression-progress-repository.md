# memory-impression-progress-repository.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

In-memory implementation of cumulative viewability progress.

## Planned Behavior

- Keep progress in a `Map` keyed by developer id.
- `addDuration()` accumulates when the campaign id matches the pending record.
- `addDuration()` replaces the pending record when the campaign id differs.
- `clearDeveloper()` removes the pending record.
- Return cloned records so tests and callers cannot mutate internal state.

## Implemented Behavior

The memory adapter implements the progress port with cloned `Map` records.
Focused tests cover same-campaign accumulation, campaign replacement, and
developer progress clearing.

## Verification 2026-06-15

- Focused web cumulative viewability run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-impression-progress-repository.test.ts src/server/bidding-service.test.ts src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented memory cumulative viewability progress repo. | Codex |
| 2026-06-15 | Created doc before adding memory cumulative viewability progress repo. | Codex |
