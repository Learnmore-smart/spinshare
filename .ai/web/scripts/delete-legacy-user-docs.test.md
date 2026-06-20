# delete-legacy-user-docs.test.mjs

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Tests the exact cleanup allowlist, dry-run behavior, and post-delete verification
without connecting to Firestore.

## Verification

Three Node test-runner cases pass for allowlist, dry run, and confirmed cleanup.
