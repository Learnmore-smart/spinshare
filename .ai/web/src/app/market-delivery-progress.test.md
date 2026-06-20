# market-delivery-progress.test.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Tests the public leaderboard delivery progress cell through static React markup.

## Planned Coverage 2026-06-20

- Exact `served / purchased` text.
- Progressbar role, value bounds, current value, and localized label.
- Percentage clamping and deterministic fill width.

## Dependencies

- Internal: `market-delivery-progress.tsx`.
- External: React, `react-dom/server`, Vitest.

## Important Notes / NEVER Change

- Assert user-visible text and accessibility semantics, not incidental wrapper classes.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created before RED component coverage. | Codex |
