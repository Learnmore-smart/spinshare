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
| `runPreflightChecks` | async function | Runs the full local runtime preflight check set. |

## Important Notes / NEVER Change

- Do not mutate local shell configuration, Claude settings, Stripe, Firebase, or
  Firestore.
- Do not print secrets.
- Missing external CLIs should produce actionable failures, not throw stack
  traces.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned local runtime preflight core helpers. | Codex |
| 2026-06-15 | Planned Java runtime compatibility check for Firestore emulator. | Codex |
| 2026-06-15 | Implemented command lookup, Java runtime execution, and aggregate preflight checks. | Codex |
