# Project Specification: SpinShare (Vampire Attack on Kickbacks.ai)

## 1. Project Overview & Strategy
We are building a developer-first ad exchange called **SpinShare** that monetizes the "wait states" (loading spinners) of AI coding agents and IDEs.

### Key Differentiators (The "Why we win" factor):
*   **Revenue Split:** We offer **60% to the developer / 40% to us**. (Competitor offers 50/50).
*   **Earning Limits:** We have **NO CAP on earnings**.
*   **Platform Support:** Terminal CLIs (Claude, Codex) AND GUI IDEs (VSCode, Trae, Cursor, Kiro).
*   **UI/UX Vibe:** Premium, modern, developer-focused aesthetic. Use your best judgment to design a high-converting, trustworthy, and sleek interface (e.g., Vercel or Linear style).

## 2. Tech Stack & Monorepo Architecture
Monorepo with three main packages: `/web`, `/cli-wrapper`, and `/vscode-extension`.

### 2.1 Web App Monolith (`/web`)
*   **Framework:** Next.js (App Router), deployed to Cloud Run.
*   **UI:** React, Tailwind CSS, Shadcn UI, Recharts.
*   **Database:** **Firestore** (Users, Campaigns, Ledger) + **Upstash Redis** (Batching impression counts to save Firestore write costs).
*   **Auth:** NextAuth (Auth.js) with Google/GitHub.
*   **Payments:** Stripe (Test Mode) + `/api/webhooks/stripe` to securely listen for payments and fund Advertiser budgets.

### 2.2 Client Packages
*   **`/cli-wrapper` (NPM Package):** Node.js script that spawns a CLI as a child process. Intercepts `stdout`, swallows spinners (`|`, `/`, `-`, `\`), and injects Ad string on one updating line.
*   **`/vscode-extension`:** Standard VSCode extension (works in Trae/Cursor). Uses `vscode.window.withProgress` to show a bottom-right native notification during AI generation containing the Ad.

## 3. Core Logic & Math

### A. The Bidding Engine (`GET /api/ad`)
*   Advertisers bid a "CPM" (Cost Per 1,000 Impressions).
*   Query Firestore for all active campaigns where `budget > 0`.
*   Sort by highest bid. The highest bidder wins the ad slot.

### B. The Ledger Engine (`POST /api/track`)
*   **Payout Math:** Calculated per impression (per "show").
*   Example: Advertiser bids $30 CPM ($0.03 per ad).
*   Developer gets 60% ($0.018 added to balance). SpinShare keeps 40%.
*   **Batching:** Endpoint increments user balance and decrements advertiser budget in **Upstash Redis** instantly. A background process flushes Redis to Firestore.

### C. Authentication Flow (Browser Auth)
*   **For CLI/Extensions:** Do NOT use manual API keys. Implement a standard Browser Login Flow (Device Authorization Grant or local callback server).
*   User types `spinshare login`, opens browser to `spinshare-web-vert.vercel.app/login`, authenticates, and the token is securely passed back to the local device.

## 4. Web Application Features
*   **Landing Page:** "Your AI is thinking. You should be earning."
*   **Developer Dashboard:** KPI Cards (Earnings), Recharts showing earnings over time, Activity Ledger table.
*   **Advertiser Dashboard:** Campaign Builder (Max 60 chars), Max CPM Bid setter, Stripe checkout "Add Funds" button.

## 5. Security & Anti-Fraud
*   **Velocity Rate-Limiting:** If a user triggers > 30 impressions/minute, shadow-ban their earnings in Redis (serve ads, don't credit) to stop open-router headless bot scripts.