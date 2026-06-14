# SiteNavAuth.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Auth-aware navbar actions for landing and other pages with a top bar. Shows sign-in/install CTAs when logged out; dashboard link + sign out when logged in.

## Planned Change (2026-06-14)

- Remove signed-in email from the navbar (email remains on dashboard Account section only).
- Do not render on developer dashboard — that page hides the top bar and places sign out in Account.

## Public API

| Name | Type | Description |
|------|------|-------------|
| SiteNavAuth | React component | Session-aware nav actions |
| SiteNavAuthProps.variant | `"landing" \| "dashboard"` | Landing shows install CTA when logged out; dashboard variant shows sign-in only when logged out |

## Dependencies

- `next-auth/react` — `useSession`, `signOut`
- `@/lib/i18n/locale-provider` — nav copy
