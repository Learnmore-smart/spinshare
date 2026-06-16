# auth.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Device authorization flow and token persistence for the VS Code extension.

## Planned Changes (2026-06-14)

- Modal sign-in prompt so toast is not accidentally dismissed.
- `showErrorMessage` when device/start fails or sign-in errors (production was returning HTML placeholder — silent failure).
- Optional `runWithProgress` wrapper during `signIn()` so UI shows activity after clicking Sign in.
- Open browser immediately after device/start; show user code if browser launch fails.

## Planned Change (2026-06-15 Claude Code Adapter)

Claude Code hook/statusLine scripts cannot access VSCode SecretStorage. Add an optional token mirror dependency so successful extension sign-in can also write the token to the CLI-compatible credential file, and sign-out can clear it. This gives generated Claude hook scripts a token source without embedding secrets in `~/.claude/settings.json`.

## Implemented Change (2026-06-15 Claude Code Adapter)

Added `TokenMirrorLike`, `FileTokenMirror`, and `defaultTokenMirrorFilePath()`. `AuthManager` now mirrors tokens after successful sign-in and clears the mirror on sign-out when a mirror is configured. Extension activation wires `new FileTokenMirror()`.

## Bug Fix Plan 2026-06-15 Existing Token Mirror Sync

When an existing extension user upgrades/restarts, their token can already be in
VS Code SecretStorage before the Claude Code file-token mirror exists. The
current mirror only saves tokens during a fresh `signIn()`, so generated Claude
hook scripts may have no readable file credential until the user signs in
again.

Fix strategy: when `initialize()` successfully loads a non-empty token from
SecretStorage, best-effort save it through the configured token mirror. Do not
clear the mirror when SecretStorage has no token, because the same file may be
owned by a separate npm CLI login.

## Bug Fix Implemented 2026-06-15 Existing Token Mirror Sync

`AuthManager.initialize()` now best-effort mirrors a non-empty token loaded from
SecretStorage. Missing/empty SecretStorage tokens leave the shared file token
mirror untouched. This lets previously signed-in extension users use generated
Claude Code hook scripts after upgrade/restart without re-running sign-in.

## Verification

- Red: `auth.test.ts` token mirror test failed because no mirror calls occurred.
- Green: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/auth.test.ts` passed.
- `corepack pnpm@9.12.0 --filter ./vscode-extension lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented existing SecretStorage token mirror sync on initialize. | Codex |
| 2026-06-15 | Planned existing SecretStorage token mirror sync on initialize. | Codex |
| 2026-06-15 | Implemented optional file token mirror for Claude Code hook scripts. | Codex |
| 2026-06-15 | Planned optional token mirror for Claude hook script auth. | Codex |
