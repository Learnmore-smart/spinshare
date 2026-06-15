# Broken Flow Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the user-visible payout, advertiser checkout, market progress, extension auto-wrap, CLI login/setup, and operator guide flows.

**Architecture:** Keep payment and payout provider behavior behind existing ports. Mock checkout should settle immediately for local development, while real Stripe checkout remains webhook-settled. The VS Code extension should package the CLI wrapper it launches from terminal shims so installing the extension is enough for new integrated terminals.

**Tech Stack:** Next.js App Router, Vitest, Stripe SDK, VS Code extension APIs, pnpm workspace scripts.

---

### Task 1: Mock Advertiser Checkout Settlement

**Files:**
- Modify: `web/src/server/ports/payment-gateway.ts`
- Modify: `web/src/server/adapters/memory/mock-payment-gateway.ts`
- Modify: `web/src/app/api/advertiser-checkout/route.ts`
- Modify: `web/src/app/api/advertiser-checkout/route.test.ts`

- [x] Add a failing test proving mock checkout funds the campaign immediately.
- [x] Add an optional `settled` marker to checkout results.
- [x] Have `MockPaymentGateway` return `settled: true` and a local success URL.
- [x] Have the public checkout route credit budget immediately only when the gateway marks checkout settled.
- [x] Verify the route test and market visibility pass.

### Task 2: Stripe Payout Connect

**Files:**
- Create: `web/src/server/adapters/stripe/stripe-config.ts`
- Modify: `web/src/server/adapters/stripe/stripe-gateway.ts`
- Modify: `web/src/server/adapters/stripe/stripe-payout-gateway.ts`
- Create: `web/src/server/adapters/stripe/stripe-payout-gateway.test.ts`
- Modify: `web/src/app/api/payouts/connect/route.ts`

- [x] Add failing coverage for Connect account create params: controller-based Express dashboard, transfers capability, no legacy `type`.
- [x] Centralize the Stripe API version and initialize both Stripe clients with it.
- [x] Build connected accounts with controller properties instead of legacy `type: "express"`.
- [x] Catch Stripe/provider failures in `/api/payouts/connect` and return a useful non-secret JSON error.
- [x] Verify focused Stripe/payout tests and typecheck.

### Task 3: Extension Terminal Auto-Wrap

**Files:**
- Modify: `vscode-extension/src/terminal-auto-wrap.ts`
- Modify: `vscode-extension/src/terminal-auto-wrap.test.ts`
- Create: `vscode-extension/scripts/bundle-cli.mjs`
- Modify: `vscode-extension/package.json`
- Modify: `vscode-extension/README.md`

- [x] Add failing tests that launcher candidates include the bundled CLI path first.
- [x] Add a package script that copies `cli-wrapper/dist` into `vscode-extension/cli-wrapper/dist`.
- [x] Make extension packaging build the CLI before bundling.
- [x] Update README/setup text to say auto-wrap applies to new integrated terminals and requires sign-in.

### Task 4: Setup Guide And Market Copy

**Files:**
- Modify: `web/src/lib/i18n/dictionaries.ts`
- Modify: `web/src/lib/i18n/extra-dictionaries.ts`
- Modify: `docs/production-test-guide.md`

- [x] Rename delivery/progress copy to describe served over purchased impressions.
- [x] Clarify that CLI "wake up" is device-flow approval at `/activate`.
- [x] Document Stripe test webhooks with `stripe listen --forward-to`.
- [x] Document extension packaging/installation expectations.

### Task 5: Verification

- [x] Run focused web tests for advertiser checkout, market, payout, and Stripe gateway.
- [x] Run focused extension tests.
- [x] Run package lint/typecheck where practical.
- [x] Summarize what was fixed and any production Stripe setup still required.
