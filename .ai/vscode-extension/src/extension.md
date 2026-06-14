# extension.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

VS Code extension activation entry point.

## What It Does

- Wires `AuthManager`, `AdApiClient`, and `AdController`.
- On activation: loads cached token, then prompts sign-in when unauthenticated (Requirement 6.4).
- Registers commands for sign-in/out and generation lifecycle hooks.

## Planned Changes (2026-06-14)

- After `auth.initialize()`, call `ensureAuthenticated()` when no token is stored so fresh installs prompt immediately.
