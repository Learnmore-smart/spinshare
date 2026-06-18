# credential-store.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Persistent Device_Auth_Token storage for the npm CLI and generated Claude Code hook credential file.

## What It Does

- Stores and loads a token from the OS keychain when keytar is available.
- Falls back to a `0600` JSON file under the user config directory.
- Exposes `createCredentialStore()` so CLI commands can use the best available store.

## Agent Decisions / Thoughts

- 2026-06-17 Codex: Follow-up hardening: a store configured with a concrete `baseUrl` must reject untagged legacy values too. Untagged credentials are ambiguous and can still silently cross local/prod boundaries. Only callers with no configured `baseUrl` may read them for backwards-compatible tooling.
- 2026-06-16 Codex: The generated Claude hook credential file is shared by extension and npm paths. To support prod/local separation, file writes should be able to include the API base URL as metadata while preserving the existing `load(): token` contract for CLI wrapper auth.
- 2026-06-17 Claude: Made both stores fully environment-aware. `save()` tags the token with its `baseUrl`; `load()` returns the token only when `credentialEnvMatches(configured, stored)` (no configured baseUrl ⇒ accept; untagged legacy token ⇒ accept; both present ⇒ exact match). This is the store-level half of Bug B (the hook applies a stricter rule and rejects untagged tokens). Keytar now stores `{token, baseUrl}` JSON but still reads a legacy bare-token value.

## Important Notes / NEVER Change

- `load()` must keep returning only the token string or `null`; wrapper callers should not need to parse credential metadata.
- File permissions must remain `0600` best-effort.
- A store configured with a `baseUrl` must also reject untagged legacy tokens; requiring re-login is safer than guessing the intended environment.
- A store configured with a `baseUrl` must never return a token tagged for a different `baseUrl` (prevents local/prod credential mixing).

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | Legacy untagged credentials could still silently cross environments when loaded by a baseUrl-configured CLI store. | Store-level compatibility allowed missing `baseUrl` metadata even when the caller knew the target environment. | With a configured `baseUrl`, untagged file/keytar values now load as `null`; only unconfigured legacy callers may read them. |
| 2026-06-17 | A local CLI/extension setup could reuse a production token (and vice versa) — ad activity from local was reported to production. | The single shared credential file/keychain entry was not scoped or verified by environment; `load()` returned any token regardless of its `baseUrl`. | `FileCredentialStore`/`KeytarCredentialStore` are now baseUrl-aware: tokens are tagged on save and `load()` refuses a token whose `baseUrl` does not match the store's environment. The CLI threads the active `baseUrl` into every store. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented strict rejection of untagged legacy credentials when a store is configured for a specific base URL. | Codex |
| 2026-06-17 | Planned strict rejection of untagged legacy credentials when a store is configured for a specific base URL. | Codex |
| 2026-06-17 | Environment-scoped credential storage (tag on save, verify on load) for both file and keytar stores; legacy untagged/bare values still read. | Claude |
| 2026-06-16 | Implemented optional baseUrl metadata in file credential writes while preserving token-only loads. | Codex |
| 2026-06-16 | Created doc before adding optional baseUrl metadata to file credentials. | Codex |
