# deploy-firestore-indexes.mjs

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Repository-local wrapper for deploying the Firestore index manifest to the Firebase project configured in `.env`.

## What It Does

- Reads `FIREBASE_PROJECT_ID` from `.env` or process env.
- Runs Firebase CLI through `npx.cmd` on Windows and `npx` elsewhere.
- Deploys only `firestore:indexes`.
- Does not print or require secret values.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `corepack pnpm@9.12.0 deploy:indexes` | root script | Deploys `firestore.indexes.json` to the configured Firebase project. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `FIREBASE_PROJECT_ID` | environment value | Yes | Firebase project id to deploy indexes to. |

## Dependencies

- **External:** `firebase-tools` via `npx` / `npx.cmd`.
- **Internal:** `.env`, `firebase.json`, `firestore.indexes.json`.

## Important Notes / NEVER Change

- Deploy only Firestore indexes, not broader Firebase resources.
- Keep this wrapper non-secret; it may print the project id but never credentials.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Wrapper failed on Windows with `spawn EINVAL`. | `.cmd` shims need to run through the Windows shell in this environment. | Use `shell: true` on Windows while keeping direct spawn elsewhere. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created Firebase index deployment wrapper design. | Codex |
| 2026-06-14 | Planned Windows spawn fix. | Codex |
