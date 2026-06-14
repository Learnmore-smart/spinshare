# firebase.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Declares Firebase CLI deployment configuration for SpinShare.

## What It Does

- Points Firebase CLI at the Firestore index manifest.
- Allows `firebase deploy --only firestore:indexes` to run from the repository root.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `firestore.indexes` | Firebase config path | Location of the Firestore index manifest. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | Static Firebase CLI config. |

## Dependencies

- **Internal:** `firestore.indexes.json` - source of truth for Firestore composite/field index deployment.
- **External:** `firebase-tools` - reads this file during deploys/emulator commands.

## Important Notes / NEVER Change

- Do not add Firebase project ids or secrets here; use CLI `--project`, Firebase aliases, or CI configuration.
- Keep this file at the repository root so Firebase CLI discovers it automatically.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created Firebase CLI config for Firestore index deployment. | Codex |
