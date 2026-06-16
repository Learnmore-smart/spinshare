# impression-progress-repo.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Firestore implementation of cumulative viewability progress.

## Planned Behavior

- Store progress in `impressionProgress/{developerId}`.
- Use Firestore transactions for `addDuration()` so concurrent short segments
  cannot lose accumulated milliseconds.
- Replace progress when the reported campaign differs from the pending campaign.
- Write `updatedAtMs` and server timestamp metadata.
- Respect `SPINSHARE_FIRESTORE_NAMESPACE` through `COLLECTIONS`.

## Implemented Behavior

The Firestore adapter stores one progress document per developer under
`COLLECTIONS.impressionProgress`. `addDuration()` runs in a transaction so
concurrent same-campaign segments accumulate safely; different campaigns
replace the pending record. `clearDeveloper()` deletes the developer progress
document.

## Verification 2026-06-15

- Focused memory/web route tests passed for the shared progress contract.
- Collection namespace coverage includes `impressionProgress`.
- A real Firestore emulator or test-namespace integration run is still needed
  before declaring cloud persistence fully verified.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented Firestore cumulative viewability progress repo. | Codex |
| 2026-06-15 | Created doc before adding Firestore progress repository. | Codex |
