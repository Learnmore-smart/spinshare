# activity-repo.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Firestore-backed implementation of `ActivityRepository`.

## Planned Behavior

- Store records in `impressionActivities`.
- Respect `SPINSHARE_FIRESTORE_NAMESPACE` through shared collection path resolution.
- Query by developer or campaign ids.

## Implemented Behavior 2026-06-15

`FirestoreActivityRepo` stores idempotently by `activityId`, queries by
developer id, and queries campaign ids in batches of 30 to respect Firestore
`in` query limits. Results are sorted by `createdAtMs` in memory.

## Planned Change 2026-06-15 Advertiser Money Events

Persist the unified activity union in the existing `impressionActivities`
collection for now to avoid adding another query path. Firestore rows with
`type: "advertiser_event"` should deserialize as advertiser money events;
legacy rows without a type remain impression attempts. Developer queries should
continue returning only impression attempts with matching `developerId`.

## Implemented Change 2026-06-15 Advertiser Money Events

Firestore activity deserialization now preserves advertiser event fields
(`amountCents`, `amountMicrocents`, `amountUsd`, `providerEventId`, and
`checkoutSessionId`). Rows with `type: "advertiser_event"` deserialize as
advertiser money events; legacy/no-type rows continue to deserialize as
impression attempts.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented Firestore support for advertiser money activity events. | Codex |
| 2026-06-15 | Planned Firestore support for advertiser money activity events. | Codex |
| 2026-06-15 | Implemented Firestore activity repository. | Codex |
| 2026-06-15 | Created doc before adding Firestore activity repository. | Codex |
