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

**Fix (2026-06-14 follow-up):** `hourlyResetLabel` is a function like `dailyResetLabel` — always appends a live duration (`滚动 60 分钟窗口 · 0m` when empty, `· 45m` when credits are aging out).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Updated `home.footerCopy` (en) to "Get paid when your AI thinks". | Auto |
| 2026-06-19 | Reworded `signin.bulletExtension` to "Supports Claude Code — more coming soon" (en/zh/fr); removed Antigravity CLI mention. | Auto |
| 2026-06-19 | Reworded `signin.bulletExtension` to "Supports Claude Code and Antigravity CLI — more coming soon" (en/zh/fr). | Auto |
| 2026-06-14 | Added `signin.bullet*` strings for denser sign-in fact list. | Auto |
| 2026-06-15 | Planned market delivery and setup-guide copy clarification. | Codex |
| 2026-06-14 | Full privacy + terms legal body en/zh/fr | AI |
| 2026-06-14 | i18n earn-vs-pay copy fix + landing/advertiser strings | AI |
