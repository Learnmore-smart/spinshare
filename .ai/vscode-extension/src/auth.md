# auth.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Device authorization flow and token persistence for the VS Code extension.

## Planned Changes (2026-06-14)

- Modal sign-in prompt so toast is not accidentally dismissed.
- `showErrorMessage` when device/start fails or sign-in errors (production was returning HTML placeholder — silent failure).
- Optional `runWithProgress` wrapper during `signIn()` so UI shows activity after clicking Sign in.
- Open browser immediately after device/start; show user code if browser launch fails.
