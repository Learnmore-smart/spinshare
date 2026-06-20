# developer-earnings-view.test.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Regression-test the earnings view's chart-versus-empty-state decision.

## Planned Coverage

Server-render a bonus-only dashboard summary with zero impressions and a
current signup-bonus row. Assert that the earnings chart renders with the $1
series and the setup empty state does not.

## Dependencies

- Internal: `developer-earnings-view`.
- External: React server rendering and Vitest mocks.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created planned bonus-only earnings view coverage. | Codex |

## Implemented Coverage 2026-06-20

Added server-render coverage proving a zero-impression bonus-only account shows
the chart at `1` and not the setup empty state.
