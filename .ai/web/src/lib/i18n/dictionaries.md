# dictionaries.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

SpinShare web UI copy for `en`, `zh`, and `fr`. All user-visible strings must resolve through `Dictionary` + `useT()`.

## Bug Fix: incomplete i18n coverage (2026-06-14)

**Problem:** Landing/sign-in/advertiser checkout were wired to i18n, but developer dashboard, setup guide, activate flow, nav auth (dashboard/sign out), advertiser dashboard, validation errors, and UTC cap labels stayed English when locale switched.

**Fix:**
- Extend `Dictionary` with `navAuth`, `developerDashboard`, `setupGuide`, `activate`, `advertiserDashboard`, `errors`, and `privacy.sections`.
- Wire all affected client components to `useT()`.
- Terms: TOC titles + intro chrome via `terms.sectionTitles`; full legal body remains English until split into locale modules.

**Fix (2026-06-14 follow-up):** Full legal body translations for Privacy (13 sections) and Terms (22 sections) in `web/src/lib/i18n/legal/` — locale switch now changes entire page content, not just titles.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Full privacy + terms legal body en/zh/fr | AI |
| 2026-06-14 | i18n earn-vs-pay copy fix + landing/advertiser strings | AI |
