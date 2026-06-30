# SpinShare — Postmortem

> An archived experiment testing AI workflow sponsor slots.

## TL;DR

The launch went viral on X.com, reaching 52K views. Four users signed up. Zero actually ran the sponsored-spinner flow. The experiment showed that viral attention doesn't translate to adoption when onboarding friction is high and the value proposition requires integration partners we didn't have. The marketplace never reached the chicken-and-egg escape velocity it needed.

## The hypothesis

AI coding tools (Claude Code, Cursor, Copilot CLI, etc.) display loading spinners while they think — sometimes for 10+ seconds. What if that dead air became an ad surface? Advertisers bid on those moments, developers earned a cut, and the AI tool stayed free.

The product had three parts:

1. **CLI interceptor** — a wrapper that sat between the AI CLI and the terminal, injecting sponsored text into the loading state.
2. **VSCode extension** — same concept, but for AI features inside the editor (Copilot Chat loading, inline generation spinners, etc.).
3. **Web marketplace** — advertisers created campaigns and funded them via Stripe; developers signed up, installed the extension/CLI wrapper, and earned per impression.

## The launch

We posted on X.com. It hit a nerve — developers loved the idea of getting paid for their AI wait time, and the "loading spinner as ad inventory" framing was novel enough to go viral.

- **52K views** on the launch tweet
- **4 signups** — a handful of users actually created accounts
- **0 usage** — nobody ran the sponsored-spinner flow end to end

## What went wrong

### 1. Onboarding friction was too high

To actually earn money, a developer had to:
1. Sign up on the website
2. Install the CLI wrapper (npm global install)
3. Configure it to intercept their AI tool
4. Or install the VSCode extension
5. Use their AI tool through the wrapper/extension
6. Wait for impressions to accumulate past the 3-second viewability threshold
7. Reach a payout minimum

That's 5+ steps before any value materializes. Each step leaked users. The 4 who signed up never made it past step 2.

### 2. Chicken-and-egg marketplace problem

Advertisers won't fund campaigns without developers to show ads to. Developers won't install the extension without campaigns to earn from. We launched without either side pre-seeded, hoping viral attention would bootstrap both. It didn't.

### 3. The value proposition required integration partners

The spinner-as-ad-surface concept only works at scale if AI tool makers either (a) integrate the ad SDK directly, or (b) tolerate a third-party wrapper intercepting their CLI output. Neither happened. The CLI wrapper felt janky — it intercepted stdout, which broke with streaming output, ANSI codes, and tool-specific formatting. The extension was smoother but still required a manual install that most developers wouldn't bother with.

### 4. Viral attention ≠ target audience

52K views on X.com sounds great, but the audience was mostly other builders/founders curious about the concept — not the working developers who'd actually install a CLI wrapper to earn $0.03 per spinner. The people who retweeted weren't the people who'd use it.

## What we learned

- **Building 70K lines of code in 1 week is not enough.** The AI era made it trivially fast to build a full-stack marketplace — CLI interceptor, VSCode extension, web app, Stripe payments, dashboards, the works. But shipping fast doesn't mean anyone will use it. Engineering speed is no longer the bottleneck. It never was the bottleneck. We just used to pretend it was because building took months, so distribution had time to figure itself out. Now building takes days, and distribution is the only thing left that's hard.
- **In the AI era, distribution matters more than the product.** A mediocre product with 10,000 engaged users beats a perfect product with 4 signups. We had the better product — a novel ad surface inside AI tools, built end-to-end in a week. We had zero distribution. The 52K views were curiosity, not demand. The 4 signups were tourists, not users. The product was never the problem; the absence of a distribution channel was.
- **Viral reach is a vanity metric without conversion.** 52K views → 4 signups → 0 usage is a 0% conversion-to-usage funnel. Attention without intent is worth nothing.
- **Two-sided marketplaces can't bootstrap on virality alone.** You need to seed one side first — either pay developers to install upfront, or give advertisers free ad credit to create initial inventory.
- **Intercepting another product's output is fragile.** Wrappers that sit between a CLI and its terminal break the moment the CLI changes its output format. Native integration is the only durable path.

## What's left

The codebase is archived but not deleted. This repo contains:

- **`web/`** — the Next.js app (landing page, dashboards, API). All payment/auth/tracking routes are disabled via a single `ARCHIVED` flag in [`web/src/proxy.ts`](web/src/proxy.ts). Set it to `false` to re-enable.
- **`cli-wrapper/`** — the CLI interceptor that injects sponsored text into AI loading spinners.
- **`vscode-extension/`** — the VSCode extension that does the same inside the editor.
- **`packages/core/`** — shared domain logic (bidding math, schemas, velocity helpers).

The experiment is over. The code is here for reference. If someone wants to revive the concept, the architecture is sound — the problem was never engineering. It was distribution.

## Metrics at a glance

| Metric | Value |
|--------|-------|
| X.com launch views | 52,000 |
| Signups | 4 |
| Sponsored-spinner runs | 0 |
| Revenue | $0 |
| Impressions served | 0 |
| Campaigns created | 0 |

---

*SpinShare was an experiment by [Noah](https://www.rateministere.com). Archived 2026.*
