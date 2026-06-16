# memory-activity-repository.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

In-memory implementation of `ActivityRepository` for local development and tests.

## Planned Behavior

- Store activity records by activity id.
- Preserve insertion order.
- Filter by developer id or campaign id list.

## Implemented Behavior 2026-06-15

`MemoryActivityRepository` records activities idempotently by `activityId` and
returns defensive copies from developer/campaign queries.

## Planned Change 2026-06-15 Advertiser Money Events

Store the new advertiser money activity event union in the same idempotent map.
`listByDeveloper()` should continue filtering developer impression attempts;
`listByCampaignIds()` should return both impression attempts and advertiser
money events for those campaigns.

## Implemented Change 2026-06-15 Advertiser Money Events

The memory adapter now stores `ActivityRecord` union values. Developer queries
filter out advertiser events; campaign queries return both impression attempts
and advertiser money events. `all()` returns the same union for tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented memory support for advertiser money activity events. | Codex |
| 2026-06-15 | Planned memory support for advertiser money activity events. | Codex |
| 2026-06-15 | Implemented memory activity repository. | Codex |
| 2026-06-15 | Created doc before adding memory activity repository. | Codex |
