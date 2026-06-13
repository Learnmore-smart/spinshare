# Project Context

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

SpinShare is a developer-first ad exchange for monetizing AI coding wait states.

## Current Focus

Pre-launch: closing the device-flow login gap. The CLI (`spinshare login`) and the
VS Code extension open `<host>/activate?user_code=...`, so the web app now ships an
`/activate` approval page plus a `POST /api/auth/device/approve` endpoint. Approval
resolves the user from the NextAuth session and mints the Device_Auth_Token via the
composition-root AuthProvider (mock locally, HMAC-signed in oauth/production). The
mock provider's `verificationUri` now uses the real host (`NEXTAUTH_URL`) instead of
the old `mock.spinshare.local` placeholder.

## Constraints

- Keep changes scoped to the web homepage unless supporting tests require a new file.
- Preserve existing sign-in routes and callback destinations.
- Use local UI patterns and Tailwind utilities.
- Do not revert unrelated working-tree edits.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation mirror for homepage redesign work | Codex |
| 2026-06-13 | Added /activate page + approve endpoint; mock verificationUri now uses real host | Kiro |
