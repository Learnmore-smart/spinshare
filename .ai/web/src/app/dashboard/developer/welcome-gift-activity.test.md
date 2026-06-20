# welcome-gift-activity.test.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Test the pure signup-bonus ledger-to-activity adapter.

## Planned Coverage

- A timestamped signup-bonus row becomes one `welcome_gift` source with stable
  id, `credited` status, em-dash campaign, and $1 amount.
- A legacy bonus without a timestamp returns `undefined` instead of inventing
  ordering data.

## Dependencies

- Internal: `welcome-gift-activity`.
- Internal: `summarize-ledger` row type.
- External: Vitest.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created planned adapter coverage before implementation. | Codex |
