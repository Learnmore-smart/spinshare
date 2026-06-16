# ad-controller.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Coordinates ad display and impression reporting for the SpinShare VS Code
extension during AI generation.

## What It Does

- Fetches the current ad when generation starts.
- Displays the ad in a progress notification.
- Dismisses the notification when generation completes.
- Reports impressions through an injected API client.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdController` | Class | Generation ad lifecycle controller. |

## Dependencies

- Internal: shared `@spinshare/core` types.
- External: injected VS Code API subset.

## Important Notes / NEVER Change

- Duplicate start signals while active must not create duplicate impressions.
- No ad means no notification and no impression.
- Tracking failures must not break the editor.

## Planned Change

Delay impression reporting until the ad has stayed visible for at least 3000
ms. Completion before the threshold must cancel the pending report.

## Implemented Change

- Added a 3000 ms viewability timer when an ad-backed generation starts.
- Cancelled the pending timer when generation completes before the threshold.
- Reported each eligible ad at most once with `viewDurationMs: 3000`.
- Preserved no-ad, duplicate-start, click-through, and failure-tolerant behavior.

## Planned Change 2026-06-15 Cumulative Viewability

When a generation completes before the local threshold, report the actual
visible duration instead of discarding it. If the fetched ad includes
`remainingViewDurationMs`, schedule the settlement timer for that remaining
duration so a pending ad can settle earlier than 3000 ms in the next generation.

## Implemented Change 2026-06-15 Cumulative Viewability

`AdController` now stores the displayed ad, token, start timestamp, and reported
flag for the active generation. Completing a generation before the timer fires
reports the actual positive visible duration so the backend can accumulate it.
The report timer uses `remainingViewDurationMs` from `/api/ad` when present, so
pending ads can settle after only the remaining view time.

## Verification

- Focused cumulative viewability extension run passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts src/ad-controller.test.ts src/ad-controller.property.test.ts`
  (3 files, 21 tests).
- Red: focused controller tests failed while impressions were still reported immediately.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/vscode-extension test -- src/api-client.test.ts src/ad-controller.test.ts src/ad-controller.property.test.ts` passed.
- Full workspace tests and lint passed; production build reached web font fetching after the extension build passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented cumulative viewability short-generation reporting. | Codex |
| 2026-06-15 | Planned cumulative viewability short-generation reporting. | Codex |
| 2026-06-13 | Created doc before adding VS Code 3-second viewability logic. | Codex |
| 2026-06-13 | Synced VS Code controller docs with 3-second viewability implementation. | Codex |
