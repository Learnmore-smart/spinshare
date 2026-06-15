# seed-learnx-campaign.mjs

## Purpose

One-off dev helper that upserts a funded **LearnX** campaign into cloud Firestore so `GET /api/ad` returns real ad copy when local mode opts into Firestore (`SPINSHARE_USE_FIRESTORE=1`).

## Document

| Field | Value |
|---|---|
| Collection | `campaigns` |
| Doc id | `cmp-learnx-demo` |
| `adText` | `LearnX · Know exactly what to study` |
| `brandName` | `LearnX` |
| `destinationUrl` | `https://www.learnx.pro` |
| `cpmCents` | `3000` ($30.00) |
| `budgetCents` | `5000` ($50.00) |
| `status` | `active` |

## Usage

```bash
node web/scripts/seed-learnx-campaign.mjs
```

Requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in repo-root `.env`.

## Changelog

| Date | Change |
|---|---|
| 2026-06-14 | Created script + doc for LearnX Firestore test seed |
