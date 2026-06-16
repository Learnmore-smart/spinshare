# login.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests `spinshare login` device-flow control flow.

## Planned Coverage

- Stores approved tokens.
- Handles browser fallback, slow_down, denial, expiry, timeout, and start
  failures.
- Runs post-login setup only after token storage succeeds.
- Treats post-login setup errors as warnings, not login failure.

## Planned Change 2026-06-15

Add regression coverage for the optional post-login setup callback before
implementing automatic Claude Code adapter setup after login.

## Implemented Change 2026-06-15

Added tests proving the post-login setup callback runs after token storage and
that callback failures warn without failing login.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented post-login setup regression tests. | Codex |
| 2026-06-15 | Created doc before adding post-login setup tests. | Codex |
