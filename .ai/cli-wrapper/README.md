# README.md

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

User-facing documentation for the npm CLI package.

## What It Does

- Explains how to install the SpinShare CLI from npm.
- Documents `spinshare login`, `spinshare setup claude-code`, and removal.
- Keeps local development commands separate from user install commands.

## Important Notes / NEVER Change

- Do not tell end users they must run `spinshare claude` for the Claude Code
  MVP; the intended path is no-touch `claude` after adapter setup/login.
- Keep explicit local development commands for maintainers.

## Planned Change 2026-06-15

Update README for npm publishability: show global npm install, Claude Code
adapter setup/removal, and clarify that legacy wrapping is fallback behavior.

## Implemented Change 2026-06-15

README now documents npm global install, `spinshare login`, explicit Claude Code
adapter setup/removal, local testing, and positions `spinshare <command>` as
legacy fallback behavior.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented npm user-doc update. | Codex |
| 2026-06-15 | Created README mirror before npm user-doc update. | Codex |
