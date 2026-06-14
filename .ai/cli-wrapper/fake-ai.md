# cli-wrapper/fake-ai.js

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Local manual test script that simulates an AI CLI spinner so developers can verify ad interception without publishing to npm.

## What It Does

- Writes spinner-only frames (`|`, `/`, `-`, `\` with `\r`) to stdout for ~5 seconds.
- Exits 0 when done.
- Run via: `node dist/index.js node fake-ai.js` from `cli-wrapper/` (after `pnpm build`).

## Dependencies

- None (plain Node.js script).

## Important Notes / NEVER Change

- Spinner glyphs must match `SPINNER_CHARS` in `renderer.ts`.
- Keep duration ≥ 3s so `WaitStateTracker` can fire an impression.
