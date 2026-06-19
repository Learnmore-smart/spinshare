# renderer.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Classifies CLI output frames and replaces wait/loading frames with SpinShare ad
text while forwarding real command output unchanged.

## What It Does

- Strips terminal control sequences for classification only.
- Treats spinner-only animation frames as wait states.
- Treats known agent loading/status lines, including Claude-style
  `Pollinating...` and Antigravity-style prefixed `Generating...`, as wait
  states.
- Emits a single carriage-return ad line for wait states when an ad is
  available.
- Forwards non-wait output byte-for-byte.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `isSpinnerFrame` | Function | Returns whether a chunk is a replaceable wait-state frame. |
| `stripAnsi` | Function | Removes ANSI sequences for classification/testing. |
| `SpinnerRenderer` | Class | Pure transform from input chunk to output bytes plus wait-state classification. |
| `createRenderer` | Function | Convenience factory for `SpinnerRenderer`. |

## Dependencies

- External: Node `Buffer`.
- Internal: none.

## Important Notes / NEVER Change

- Non-wait output must remain byte-for-byte identical.
- Status-line detection must stay conservative to avoid replacing real command
  output such as build logs.
- The public `isSpinnerFrame` name is retained for compatibility even though it
  now covers broader wait-state frames.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | Wrapped Antigravity CLI can still print its own `Generating...` line instead of a SpinShare ad. | Antigravity prefixes the transient `Generating...` wait text with a Braille/symbol status marker; the renderer only stripped bullets, middle dots, and `*` before matching wait words. | Planned: allow a single conservative symbol/Braille status prefix before known one-word AI wait messages, while keeping ordinary log lines such as `Loading config...` as pass-through. |
| 2026-06-15 | Claude Code showed `Pollinating...` instead of a SpinShare ad. | The renderer only detected ASCII spinner glyph frames, while Claude emits text status frames during waits. | Recognize conservative AI-agent loading/status lines as wait-state frames and replace them with ads. |

## Bug Fix Implemented 2026-06-19 Antigravity status prefix

`STATUS_PREFIX_PATTERN` now allows a single conservative leading status symbol,
including common sparkle/status glyphs and Braille spinner glyphs, before known
one-word AI wait messages. The status-word allowlist still blocks ordinary log
lines such as `Loading config...`.

Verification:
- RED: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts`
  failed on prefixed Antigravity `Generating...` assertions.
- GREEN: the same focused CLI renderer test passed 14 tests.

## Planned Change (2026-06-15)

Add conservative status-line classification for single-line loading messages
such as `Pollinating...`, `Thinking...`, `Generating...`, and `Loading...`.
Keep ordinary real output like `Building project...` as pass-through.

## Implemented Change (2026-06-15)

`isSpinnerFrame` now returns true for spinner glyph frames and conservative
single-word agent wait/status frames. `SpinnerRenderer` therefore replaces
Claude-style `Pollinating...` output with ad text while still forwarding normal
command output such as `Loading config...`.

## Verification (2026-06-15)

- Red focused CLI tests failed on `Pollinating...` classification before the
  implementation.
- Focused CLI tests passed: `renderer.test.ts` and `wrap.test.ts`, 31 tests.
- Full CLI tests passed: 10 files, 77 tests.
- CLI type check passed: `corepack pnpm@9.12.0 --filter @spinshare/cli lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented Antigravity prefixed `Generating...` wait-line classification. | Codex |
| 2026-06-19 | Planned Antigravity prefixed `Generating...` wait-line classification. | Codex |
| 2026-06-15 | Implemented conservative agent status-line wait detection. | Codex |
| 2026-06-15 | Created doc before adding agent loading/status-line detection. | Codex |
