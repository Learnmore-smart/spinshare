# welcome-gift-activity.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Purely adapt the durable signup-bonus ledger row into the pinned activity source
shown in developer Recent credit.

## Planned Behavior

- Find the normalized `signup_bonus` ledger row.
- Return one stable `welcome_gift` activity using the ledger id, amount, and
  timestamp.
- Use an em dash for the absent campaign association.
- Return `undefined` when the bonus is absent or has no durable timestamp;
  never fabricate persisted metadata.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `welcomeGiftActivityFromRows` | Function | Converts ledger rows into an optional pinned activity source. |

## Dependencies

- Internal: `../activity-feed` activity source contract.
- Internal: `./summarize-ledger` presentation row contract.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Keep this adapter pure and separate from the server
  layout so it can be tested without authentication, React, or repository I/O.

## Important Notes / NEVER Change

- Do not write a second durable activity record.
- Preserve the deterministic ledger id for de-duplication.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created planned welcome-gift ledger-to-activity adapter. | Codex |

## Implemented Behavior 2026-06-20

`welcomeGiftActivityFromRows()` returns one timestamped, stable-id
`welcome_gift` source from the normalized bonus row and returns `undefined`
when the row or timestamp is absent.
