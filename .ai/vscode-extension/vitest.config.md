# vitest.config.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Vitest configuration for the VS Code extension package.

## Implemented Change

Include script-level `.test.mjs` tests so packaging helpers can be tested
without moving build tooling into extension runtime source.

## Important Notes / NEVER Change

- Keep `out`, `dist`, and `coverage` excluded so compiled test files are never
  double-run.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Included script-level `.test.mjs` tests. | Codex |
| 2026-06-16 | Planned inclusion of script-level tests for packaging helpers. | Codex |
