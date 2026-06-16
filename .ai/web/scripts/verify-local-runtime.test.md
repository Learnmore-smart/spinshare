# verify-local-runtime.test.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for the local runtime preflight helpers.

## Planned Coverage

- Dotenv parsing preserves simple quoted and unquoted values.
- Command lookup honors PATH and Windows PATHEXT.
- Missing commands return failed result objects with actionable details.
- Node version check requires Node 20+.
- Java version output check fails below Java 11 and warns below Java 21.
- Local cloud Firestore usage requires `SPINSHARE_FIRESTORE_NAMESPACE` unless
  `FIRESTORE_EMULATOR_HOST` is set.
- The aggregate preflight includes Node, Claude, Stripe, Firebase, npx, Java,
  and Firestore isolation checks.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned local runtime preflight test coverage. | Codex |
| 2026-06-15 | Planned Java runtime compatibility coverage. | Codex |
| 2026-06-15 | Implemented tests for dotenv parsing, command lookup, Java parsing, env isolation, and aggregate preflight ordering. | Codex |
