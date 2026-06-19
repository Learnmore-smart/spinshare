# delete-prod-learnx-campaign.mjs

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

One-off helper that removes the LearnX demo campaign from **production** Firestore
(top-level `campaigns`, no namespace) and clears any leftover RTDB budget node.

## What It Does

- Deletes `campaigns/cmp-learnx-demo` when present.
- Also deletes any campaign whose `brandName` or `adText` contains `LearnX`.
- Removes `spinshare/hot/bud/cmp-learnx-demo` from RTDB when `FIREBASE_DATABASE_URL` is set.

## Usage

```bash
node web/scripts/delete-prod-learnx-campaign.mjs --production
```

Requires repo-root `.env` with `FIREBASE_*` service-account creds. Pass `--production` to
target top-level `campaigns` even when `.env` sets `SPINSHARE_FIRESTORE_NAMESPACE=test`.
