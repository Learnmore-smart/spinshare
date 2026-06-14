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


## Change log — 2026-06-13: Clickable ads + dashboard form parity

**Why:** The home page advertiser checkout form already collected a Destination
URL (plus brand name, brand icon, leaderboard visibility), but those fields
never reached the displayed ad, and the authenticated dashboard campaign builder
only had ad text + CPM. Ads shown in the CLI/VSCode were not clickable, and a
fresh build failed because the consumed `@spinshare/core` dist predated the new
`Campaign` fields.

**What changed:**
- `@spinshare/core`
  - `AdResponseAvailable` now carries optional `destinationUrl` + `brandName`.
  - `createCampaignSchema` accepts optional `destinationUrl`, `brandName`,
    `brandIconDataUrl`, `publicOnLeaderboard` (field schemas relocated above the
    schema to avoid a TDZ error). Backward compatible — `{ adText, cpmCents }`
    still validates.
  - Rebuilt the `dist` so web/cli/vscode see the current `Campaign` type
    (this resolved the prior `publicOnLeaderboard` type errors).
- Web
  - `bidding-service` includes `destinationUrl`/`brandName` on the winning ad.
  - `POST /api/campaigns` threads the new optional fields to `campaigns.create`.
  - Dashboard `campaign-builder.tsx` now has Destination URL, Brand name, Brand
    icon, and "Show on public leaderboard" inputs to match the home form.
  - `FirestoreLedgerRepo.listByDeveloper` no longer needs a composite index
    (sorts in memory), so a $0 developer sees the empty state, not an error.
- CLI: ad text is wrapped in an OSC 8 terminal hyperlink when a `destinationUrl`
  is present (clickable in modern terminals; degrades to plain text otherwise).
- VSCode: when the ad has a `destinationUrl`, the controller surfaces a
  dismissible "Open" action (wired to `env.openExternal`) alongside the progress
  notification. Optional/guarded so the existing property test is unaffected.

**Env:** No new environment variables. The dashboard fix removed a Firestore
composite-index requirement (infra), not an `.env` value.

**Verified:** typecheck clean (core/web/cli/vscode); tests green
(core 31, web 96/1 skipped, cli 68, vscode 25).

## Change log - 2026-06-13: 3-second viewability rule

**Why:** Impressions should only count when an ad stays visible for at least
three seconds. Fast AI generations should not trigger advertiser billing or
developer credit.

**What changed:**
- Shared core tracking schema now requires `viewDurationMs >= 3000`.
- CLI and VS Code delay impression tracking until the 3000 ms threshold and
cancel the pending request if generation finishes earlier.
- `/api/track` rejects below-threshold or missing duration payloads before
ledger mutation.
- Homepage and advertiser dashboard both display `3-second minimum views`.
- Unit, property, route, and e2e coverage now use the duration-aware contract.

**Verified:** `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`
passed. `corepack pnpm@9.12.0 build` passed core, CLI, and VS Code, then the
web build was blocked by restricted Google Fonts network access.
