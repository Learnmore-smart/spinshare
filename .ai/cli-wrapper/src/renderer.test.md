# renderer.test.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Unit tests for the pure renderer/classifier used by the CLI wrapper.

## What It Does

- Verifies spinner glyph frames are classified as wait states.
- Verifies Claude-style loading/status lines are classified as wait states.
- Verifies Antigravity-style prefixed `Generating...` lines are classified as
  wait states.
- Verifies real command output remains pass-through.
- Verifies ad rendering suppresses the original wait frame.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `isSpinnerFrame` tests | Vitest suite | Classification coverage. |
| `SpinnerRenderer` tests | Vitest suite | Transform/output coverage. |

## Dependencies

- Internal: `./renderer.js`.
- External: Vitest.

## Important Notes / NEVER Change

- Tests must prove real output is not replaced accidentally.
- Tests must include a Claude-style `Pollinating...` frame because that is the
  user-visible regression.

## Planned Change (2026-06-15)

Add failing tests that classify `Pollinating...` status frames as wait states
and prove `SpinnerRenderer` replaces them with ad text without leaking the
original loading phrase.

## Implemented Test (2026-06-15)

Added tests for Claude-style `Pollinating...` frames, ANSI-colored loading
frames, and `Thinking...` frames. The tests also prove `Loading config...` stays
real output and that rendered ad output does not leak the original loading text.

## Planned Test 2026-06-19 Antigravity CLI status prefix

Add a red regression test for Antigravity's observed `Generating...` wait line
with a leading symbol/Braille-style status marker. The same test group should
continue proving real output such as `Loading config...` is not replaced.

## Implemented Test 2026-06-19 Antigravity CLI status prefix

Added classifier coverage for Braille-prefixed and sparkle-prefixed
`Generating...` lines and renderer coverage proving the Antigravity-style wait
line is replaced by the ad text without leaking the original status text.

Verification:
- RED: focused CLI renderer test failed on the new prefixed `Generating...`
  assertions.
- GREEN: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts`
  passed 14 tests.

## Verification (2026-06-15)

- Red focused CLI run failed on the new renderer assertions.
- Green focused CLI run passed: `renderer.test.ts` and `wrap.test.ts`, 31 tests.
- Full CLI test run passed with 77 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added Antigravity prefixed wait-line renderer coverage. | Codex |
| 2026-06-19 | Planned Antigravity prefixed wait-line renderer coverage. | Codex |
| 2026-06-15 | Added loading/status-line renderer regression tests. | Codex |
| 2026-06-15 | Created doc before adding loading/status-line regression tests. | Codex |
