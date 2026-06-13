# advertiser-checkout-form.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Client-side homepage form that lets advertisers bid and start Stripe checkout without entering the dashboard first.

## What It Does

- Collects email, ad line, destination URL, optional brand metadata, public/private leaderboard preference, CPM bid, and block count.
- Shows a live estimated total using the existing 1,000-view block model.
- Posts to `/api/advertiser-checkout` and redirects to Stripe Checkout.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserCheckoutForm` | React component | Homepage advertiser checkout form. |

## Dependencies

- External: `react` for form state.
- External: `lucide-react` for compact UI icons.
- Internal: advertiser dashboard validation helpers for dollar parsing and ad text state.

## Important Notes / NEVER Change

- Keep the UI aligned with the homepage glass/mint visual system.
- Do not require an authenticated advertiser token for this public funnel.
- Preserve the public leaderboard toggle in the submitted payload.

## Planned Change

Add a native SpinShare-styled form inspired by the reference screenshot, with Stripe redirect behavior and inline validation.

## Implemented Change

Added `AdvertiserCheckoutForm`, a client component mounted on the homepage market-depth section. It collects advertiser details, validates ad text/CPM/block count locally, reads optional small image uploads as data URLs, posts to `/api/advertiser-checkout`, and redirects to Stripe.

## Verification

- Homepage static regression test now asserts the form copy and CTA are rendered.
- Final web tests, TypeScript check, and production build passed.

## Planned Adjustment

Refine the form visuals after screenshot review:

- Change the ad-line placeholder to the LearnX copy used elsewhere on the homepage.
- Replace the browser-default leaderboard checkbox with a clearly-styled custom control that matches the mint glass UI.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before implementing homepage checkout form. | Codex |
| 2026-06-13 | Synced doc with implemented homepage checkout form and verification. | Codex |
