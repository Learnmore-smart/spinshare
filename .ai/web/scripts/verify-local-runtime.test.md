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
- Local mock auth warns when the client-side credentials shortcut flag is not
  enabled.
- Local real Stripe usage requires durable Firestore storage, either emulator
  or namespace-isolated local cloud Firestore.
- The aggregate preflight includes Node, Claude, Stripe, Firebase, npx, Java,
  Firestore isolation, local credentials shortcut, and local Stripe durability
  checks.

## Planned Coverage 2026-06-16 Local Credentials Shortcut Check

Add `checkLocalCredentialsShortcut()` tests for:

- warning when `SPINSHARE_MODE=local`, `AUTH_MODE=mock`, and
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS` is missing;
- pass when the flag is `1`;
- aggregate preflight includes the new check.

## Implemented Coverage 2026-06-16 Local Credentials Shortcut Check

Added direct tests for `checkLocalCredentialsShortcut()` and updated the
aggregate preflight ordering expectation to include
`env.local.credentialsShortcut`.

## Planned Coverage 2026-06-16 Local Real-Stripe Durability Check

Add `checkLocalStripeDurability()` tests for:

- pass when Stripe is mock;
- failure when `SPINSHARE_MODE=local`, `STRIPE_MODE=test|live`, and durable
  repos are memory-backed;
- pass when real Stripe is paired with `FIRESTORE_EMULATOR_HOST`;
- pass when real Stripe is paired with `SPINSHARE_USE_FIRESTORE=1` and
  `SPINSHARE_FIRESTORE_NAMESPACE`.
- aggregate preflight includes `env.local.stripeDurability`.

## Implemented Coverage 2026-06-16 Local Real-Stripe Durability Check

Added focused tests for mock Stripe, unsafe local real Stripe with memory repos,
Firestore emulator, and namespace-isolated Firestore. The aggregate preflight
ordering now includes `env.local.stripeDurability`.

## Planned Coverage 2026-06-16 Conditional Java Emulator Check

Add aggregate preflight coverage proving Java 8 does not fail when
namespace-isolated cloud Firestore is selected and no emulator host is set.
Keep the lower-level Java parser test unchanged so emulator compatibility still
fails below Java 11.

## Implemented Coverage 2026-06-16 Conditional Java Emulator Check

Added aggregate coverage proving Java 8 becomes a warning pass when namespace
Firestore is selected and no emulator host is set.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented conditional Java emulator preflight coverage. | Codex |
| 2026-06-16 | Planned conditional Java emulator preflight coverage. | Codex |
| 2026-06-16 | Implemented local real-Stripe durability preflight tests. | Codex |
| 2026-06-16 | Planned local real-Stripe durability preflight tests. | Codex |
| 2026-06-16 | Added local credentials shortcut preflight tests. | Codex |
| 2026-06-16 | Planned local credentials shortcut preflight tests. | Codex |
| 2026-06-15 | Planned local runtime preflight test coverage. | Codex |
| 2026-06-15 | Planned Java runtime compatibility coverage. | Codex |
| 2026-06-15 | Implemented tests for dotenv parsing, command lookup, Java parsing, env isolation, and aggregate preflight ordering. | Codex |
