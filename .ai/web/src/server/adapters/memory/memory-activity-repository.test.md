# memory-activity-repository.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests in-memory activity repository behavior.

## Planned Coverage

- Records attempts idempotently by activity id.
- Lists by developer.
- Lists by campaign ids.

## Implemented Coverage 2026-06-15

All planned memory repository cases are covered and passed in web full test.

## Planned Coverage 2026-06-16 Checkout Session Lookup

Add a test proving `listByCheckoutSessionId()` returns only advertiser events
for the requested Checkout Session id and excludes impression attempts or other
sessions.

## Implemented Coverage 2026-06-16 Checkout Session Lookup

The memory repository test now records an impression attempt, a matching
checkout advertiser event, and another checkout session, then asserts only the
matching advertiser event is returned.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented checkout session lookup coverage. | Codex |
| 2026-06-16 | Planned checkout session lookup coverage. | Codex |
| 2026-06-15 | Implemented memory activity repository tests. | Codex |
| 2026-06-15 | Created doc before adding memory activity tests. | Codex |
