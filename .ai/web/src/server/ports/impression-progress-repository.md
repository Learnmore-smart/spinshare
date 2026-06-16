# impression-progress-repository.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Port for durable cumulative viewability progress.

## Planned Behavior

- Store at most one pending campaign per developer.
- Add positive view-duration segments for the same campaign.
- Reset progress if a different campaign is reported for the same developer.
- Clear progress once cumulative duration settles or becomes invalid.
- Keep this as a durable port so local memory and Firestore paths behave the same.

## Implemented Behavior

The port is implemented with `getByDeveloper`, `addDuration`, and
`clearDeveloper`. It stores one pending campaign per developer and lets
adapters replace progress when a different campaign is reported.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ImpressionProgressRepository` | interface | Reads, adds, and clears pending view progress. |
| `ImpressionProgress` | interface | Developer/campaign cumulative progress record. |

## Agent Decisions / Thoughts

- One pending campaign per developer matches the product requirement: if a view
  is too short, the next ad fetch should continue that same ad instead of
  bidding again.
- Progress belongs in durable repos, not RTDB counters, because it controls the
  next ad-selection decision and must survive process restarts.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented cumulative viewability progress port. | Codex |
| 2026-06-15 | Created doc before adding cumulative viewability progress port. | Codex |
