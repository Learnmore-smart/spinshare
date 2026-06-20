# delete-legacy-user-docs.mjs

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Deletes only the two explicitly authorized random-UUID Firestore user test docs.

## Safety

- Exact hard-coded allowlist; no arbitrary path input.
- Dry-run by default.
- Requires `--confirm` for deletion.
- Reads back both paths after deletion.

## Execution 2026-06-20

Ran against Firebase project `spinshare-5e6cf`: dry run found both allowlisted
documents; confirmed cleanup deleted 2 and verification reported 0 remaining.
