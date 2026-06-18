# verify-local-runtime-core.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Dependency-free helper functions for checking whether the local machine is ready
to run the remaining real external verification steps.

## What It Does

- Parses dotenv-style env files without printing secrets.
- Checks command availability through injectable filesystem access.
- Checks Node version.
- Checks Java runtime output for Firestore emulator compatibility and can run
  `java -version` directly with a timeout.
- Evaluates local Firestore namespace safety.
- Evaluates whether local mock auth exposes the client-side credentials shortcut
  needed by `/signin`.
- Produces plain result objects consumed by the CLI wrapper and tests.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `parseDotEnv` | function | Parses `.env` content into a string map. |
| `checkCommand` | async function | Checks whether a command exists on PATH, with Windows PATHEXT support. |
| `checkNodeVersion` | function | Validates Node major version. |
| `checkJavaVersionOutput` | function | Parses `java -version` output and requires Java 11+ for the current Firestore emulator, warning below Java 21. |
| `checkJavaRuntime` | async function | Runs `java -version`, or an injected runner in tests. |
| `checkLocalFirestoreIsolation` | function | Flags unsafe local cloud Firestore usage without namespace. |
| `checkLocalCredentialsShortcut` | function | Warns when local mock auth is enabled but the client-side credentials shortcut flag is missing. |
| `runPreflightChecks` | async function | Runs the full local runtime preflight check set. |

## Planned Change 2026-06-16 Local Credentials Shortcut Check

When `SPINSHARE_MODE=local` and `AUTH_MODE=mock`, warn if
`NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS` is not `1`. Without that flag,
`/signin` hides the local test-account button, so extension/CLI device login can
open `/activate` but not complete approval on machines without OAuth creds.

## Implemented Change 2026-06-16 Local Credentials Shortcut Check

Added `checkLocalCredentialsShortcut(env)` and included it in
`runPreflightChecks()`. It emits warning-severity results only: missing the flag
should diagnose local sample auth, not block unrelated external runtime checks.

## Planned Change 2026-06-16 Local Real-Stripe Durability Check

Bug: `.env` can select `SPINSHARE_MODE=local` and `STRIPE_MODE=test|live` while
durable repositories remain in memory. A real Stripe test payment can succeed,
but the paid campaign will not persist and will not become biddable unless a
webhook reaches the same process before it restarts.

Fix strategy:

- Add `checkLocalStripeDurability(env)`.
- Pass when Stripe is mock, when Firestore emulator is configured, or when
  local cloud Firestore is explicitly enabled with namespace isolation.
- Fail with a clear message when local real Stripe is paired with in-memory
  durable repos.
- Include the check in `runPreflightChecks()`.

## Implemented Change 2026-06-16 Local Real-Stripe Durability Check

Added `checkLocalStripeDurability(env)` and included it in
`runPreflightChecks()`. It fails when local real Stripe is paired with
memory-backed durable repos, and passes for mock Stripe, Firestore emulator, or
namespace-isolated local cloud Firestore.

## Planned Change 2026-06-16 Conditional Java Emulator Check

Bug: the aggregate local runtime preflight always runs `java -version` as a
required check, even when the active local persistence strategy is namespace-
isolated cloud Firestore (`SPINSHARE_USE_FIRESTORE=1` +
`SPINSHARE_FIRESTORE_NAMESPACE`) and no `FIRESTORE_EMULATOR_HOST` is set.
That reports Java 8 as a blocker even though the emulator is not part of the
current path.

Fix strategy: keep `checkJavaVersionOutput()` strict for emulator compatibility,
but add an env-aware wrapper for aggregate preflight. Java should be required
only when `FIRESTORE_EMULATOR_HOST` is set. Otherwise return a warning-severity
pass explaining that the Firestore emulator is not selected.

## Implemented Change 2026-06-16 Conditional Java Emulator Check

Added `checkJavaRuntimeForSelectedFirestore(env, options)` and wired
`runPreflightChecks()` to use it. Namespace-isolated cloud Firestore now reports
`PASS java.version: Firestore emulator is not selected; Java runtime is not
required`. `checkJavaVersionOutput()` remains strict for direct emulator
compatibility checks.

## Important Notes / NEVER Change

- Do not mutate local shell configuration, Claude settings, Stripe, Firebase, or
  Firestore.
- Do not print secrets.
- Missing external CLIs should produce actionable failures, not throw stack
  traces.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented conditional Java check based on Firestore emulator selection. | Codex |
| 2026-06-16 | Planned conditional Java check based on Firestore emulator selection. | Codex |
| 2026-06-16 | Implemented local real-Stripe durability preflight check. | Codex |
| 2026-06-16 | Planned local real-Stripe durability preflight check. | Codex |
| 2026-06-16 | Implemented local credentials shortcut preflight warning. | Codex |
| 2026-06-16 | Planned local credentials shortcut preflight warning. | Codex |
| 2026-06-15 | Planned local runtime preflight core helpers. | Codex |
| 2026-06-15 | Planned Java runtime compatibility check for Firestore emulator. | Codex |
| 2026-06-15 | Implemented command lookup, Java runtime execution, and aggregate preflight checks. | Codex |
