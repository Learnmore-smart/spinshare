# smoke-local-cli.test.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Tests pure helpers for the local CLI smoke script.

## Planned Coverage

- Accepts captured CLI output containing the local sample ad text.
- Rejects output without the local sample ad text.
- Builds the expected CLI command: Node executable, built CLI entrypoint,
  target `node`, and `cli-wrapper/fake-ai.js`.
- Verifies the CLI child timeout is bounded.

## Dependencies

- External: `vitest`.
- Internal: `web/scripts/smoke-local-cli.mjs`.

## Important Notes / NEVER Change

- Keep tests pure; do not start a server or run the CLI from the unit test.
- Runtime verification belongs to `corepack pnpm@9.12.0 smoke:local-cli`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Planned CLI child timeout coverage. | Codex |
| 2026-06-17 | Planned local CLI smoke helper tests. | Codex |
