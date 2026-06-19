# setup-guide-modal.tsx

## Purpose
Dashboard modal that walks developers through connecting SpinShare so impressions credit to their account.

## Planned change (2026-06-19)
- **Outdated UX:** Modal offered IDE extension vs CLI wrapper tabs; standalone CLI is not a supported user path.
- Remove CLI path and segment toggle entirely.
- Step 1: copy-paste the same VSIX install command shown on the marketing home page (`curl -L https://spinshare.dev/vsix …`).
- Keep steps 2–4: sign in from editor, open new integrated terminal, confirm on dashboard.
- Subtitle and empty-state copy should mention extension only (no CLI).
- Share install command constant with `page.tsx` via `web/src/lib/spinshare-install-command.ts`.

## Dependencies
- `@/lib/spinshare-install-command` — canonical install one-liner
- `@/lib/i18n/extra-dictionaries` — `setupGuide` strings (extension-only)
- `developer-overview-view`, `developer-earnings-view`, `developer-activity-view` — entry points

## Layout (2026-06-19)
- Header title/subtitle: `text-center`; close button `absolute` top-right so it does not shift centered text.
- Body/steps: explicit `text-left` to override `text-align: center` inherited from `.dev-dash-empty` parent.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Center modal header; left-align step copy; absolute close button. | Cursor |
| 2026-06-19 | Extension-only setup guide; home-page install command. | Cursor |
