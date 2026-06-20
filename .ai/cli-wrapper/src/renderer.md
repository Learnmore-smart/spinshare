# renderer.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Classifies CLI output frames and replaces wait/loading frames with SpinShare ad
text while forwarding real command output unchanged.

## What It Does

- Strips terminal control sequences for classification only.
- Treats spinner-only animation frames as wait states.
- Treats known agent loading/status lines, including Claude-style
  `Pollinating...` and Antigravity-style prefixed `Generating...` / `Working...`
  / `Running...` / `Executing...` / `Computing...` / `Planning...`, as wait
  states.
- Emits ad text for wait states when an ad is available, painted in bright blue
  (SGR 94, reset with SGR 39) so the sponsored line is visually distinct.
- Can render status-line ads below the agent's loading message using terminal
  save/restore cursor sequences, so generic PTY-wrapped CLIs keep their own
  prompt/loading line.
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
| 2026-06-19 | Antigravity shows ads only intermittently ("sometimes showing, sometimes not"), and ads were not visually distinct. | Antigravity/Gemini-CLI rotates its wait line through `Running...` (and other words) that were absent from the wait-word allowlist, so unrecognized frames were treated as real output — clearing the ad until the next recognized frame. Ads were also emitted as plain/hyperlinked text with no color. | Added `running`, `executing`, `computing`, `planning` to `STATUS_WORD_PATTERN`, and colored the rendered ad bright blue via exported `AD_COLOR` / `AD_COLOR_RESET`. The single-word `^…$` anchor keeps multi-word real output (e.g. `Running tests in web...`) as pass-through. |
| 2026-06-19 | Antigravity ads flicker and appear inside the prompt/input area while the CLI cycles through multiple wait messages. | `Working...` was not recognized as a wait word, so the wrapper dropped out of wait mode between Antigravity spinner variants. Status wait frames were also rendered by replacing the current line, which can collide with CLIs that reserve the bottom line for input/status. | Planned: recognize `Working...`, add a status-line placement mode that leaves the loading message in place and paints the ad one line below using save/restore cursor, and have the wrapper use that mode for PTY agents. |
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

## Bug Fix Implemented 2026-06-19 Antigravity stable below-status rendering

Added `working` to the conservative wait-word allowlist and added
`statusPlacement: "below"` to `SpinnerRenderer`. In below-status mode the
renderer preserves the agent's loading/status text, paints the ad one line below
using save/restore cursor sequences, and clears that below-status ad line before
forwarding the next real output.

Verification:
- RED: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts`
  failed because `Working...` was not recognized and below-status rendering did
  not exist.
- GREEN: the same focused renderer test passed 16 tests.

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
| 2026-06-19 | Implemented stable below-status rendering for Antigravity spinner variants. | Codex |
| 2026-06-19 | Planned stable below-status rendering for Antigravity spinner variants. | Codex |
| 2026-06-19 | Implemented Antigravity prefixed `Generating...` wait-line classification. | Codex |
| 2026-06-19 | Planned Antigravity prefixed `Generating...` wait-line classification. | Codex |
| 2026-06-15 | Implemented conservative agent status-line wait detection. | Codex |
| 2026-06-15 | Created doc before adding agent loading/status-line detection. | Codex |
