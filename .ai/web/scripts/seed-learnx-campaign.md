# seed-learnx-campaign.mjs

## Purpose

One-off dev helper that upserts a funded **LearnX** campaign into cloud
Firestore so `GET /api/ad` returns real ad copy when local mode opts into
Firestore (`SPINSHARE_USE_FIRESTORE=1`).

## Document

| Field | Value |
|---|---|
| Collection | `campaigns` by default, or `namespaces/<SPINSHARE_FIRESTORE_NAMESPACE>/campaigns` when namespace is set |
| Doc id | `cmp-learnx-demo` |
| `adText` | `LearnX - Know exactly what to study` |
| `brandName` | `LearnX` |
| `destinationUrl` | `https://www.learnx.pro` |
| `cpmCents` | `3000` ($30.00) |
| `budgetCents` | `5000` ($50.00) |
| `status` | `active` |

## Usage

```bash
node web/scripts/seed-learnx-campaign.mjs
```

Requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
`FIREBASE_PRIVATE_KEY` in repo-root `.env`.

For localhost cloud-Firestore testing, set `SPINSHARE_FIRESTORE_NAMESPACE=test`
before running the seed so the demo campaign lands in the same namespace that
the local web app reads.

## Bug Fix Plan 2026-06-17 Namespace-Aware Seed

The app's Firestore adapter reads campaign documents from
`namespaces/<namespace>/campaigns` when `SPINSHARE_FIRESTORE_NAMESPACE` is set,
but this script previously wrote directly to top-level `campaigns`. That could
make localhost keep serving an old or missing LearnX demo campaign even though
the seed script appeared to succeed.

Fix strategy: expose and use a small namespace-aware campaign collection path
helper matching the app's Firestore collection convention. Keep the default
collection as top-level `campaigns` when namespace is unset. Add script-level
coverage for default path, `test` namespace path, invalid namespace rejection,
and the LearnX destination URL.

## Bug Fix Implemented 2026-06-17 Namespace-Aware Seed

The script now exports `campaignCollectionPath()` and uses it for the Firestore
write. With `SPINSHARE_FIRESTORE_NAMESPACE=test`, LearnX is seeded into
`namespaces/test/campaigns`, matching the local web app's durable Firestore
adapter. The script also has a direct-run guard so tests can import helpers
without contacting Firestore, and the demo copy is ASCII-safe.

## Changelog

| Date | Change |
|---|---|
| 2026-06-17 | Implemented namespace-aware campaign collection path and testable exports |
| 2026-06-17 | Planned namespace-aware campaign collection path for local Firestore test seed |
| 2026-06-14 | Created script + doc for LearnX Firestore test seed |
