# Long-Term Stability Plan

> Last updated: 2026-06-19 | Goal: stop 修修补补 — make correctness *enforced & observable*, not *assumed*.

## Thesis

The core is a genuinely good foundation (pure money math in `packages/core`, property tests, clean ports/adapters, indistinguishable-response settlement). The risk is that **correctness is currently assumed, not enforced**: nothing ran the tests on every change, nothing proved the memory adapter (what tests exercise) matches Firestore/RTDB (what prod runs), nothing proves money is conserved end-to-end, and nothing schedules the anti-fraud enforcement. That gap is what turns good code into band-aids over time. The durable path = build the enforcement net, then un-defer a few specific decisions — NOT rewrite, NOT more features.

## Sequenced plan

### ✅ Foundation 1 — CI gate (DONE)
`.github/workflows/ci.yml`:
- `verify` job: `lint · test · build` across all packages on every push/PR (fast lane, no emulator → emulator-gated tests skip).
- `parity` job: boots the Firestore emulator (`firebase emulators:exec`) and runs the web suite against it, so the adapter-parity contract + flush integration actually RUN.
- Concurrency-cancel on superseded runs.
- ⚠️ First run reveals the true baseline for the **cli + extension** suites (not run locally this session). Add branch protection once green.

### ✅ Foundation 2 — Green suite (DONE)
`web/vitest.config.ts` excludes `scripts/**` — the `*.test.mjs` smoke/dev scripts (run via `smoke:*` npm scripts) were swept into the unit run and permanently red, normalising "ignore failures". Now a red run = a real regression. Web: 394 pass / 12 skip / **0 fail**.

### ✅ Foundation 3 — Adapter-parity contract tests (DONE — all 5 repos)
The structural fix for "green in memory, wrong in Firestore" — the #1 risk of a ports/adapters codebase whose fast suite only exercises memory.
- ✅ Harness pattern: `web/src/server/ports/__contracts__/*.contract.ts` exports `run<Port>Contract(name, harness)`; each adapter has a thin `*.contract.test.ts` binding. Memory bindings run always (fast lane + CI); Firestore/RTDB bindings run emulator-gated in the CI `parity` / `parity-rtdb` jobs and skip otherwise.
- ✅ **UserRepository** (11) — held/available, lot maturation/clawback, available-aware debit, payout-fingerprint dedupe.
- ✅ **ActivityRepository** (4) — `ipHash`/`uaHash` + money-field round-trip through `toActivity` (where Tier 1b/2c drift would hide), idempotent record, `listRecentImpressions` filtering.
- ✅ **LedgerRepository** (5) — idempotency by `entryId` (the anti-double-count guarantee), money-field round-trip, `countByCampaignIds`.
- ✅ **CampaignRepository** (8) — lifecycle, `applyBudgetDeltaCents`, the `listBiddable` predicate.
- ✅ **CounterStore** (9) — applyImpression credit/budget/idempotency, drain→ack/nack reconciliation, consumeOnce replay, velocity/ip-velocity/ip-fanout, shadow-ban, earning windows, telemetry. RTDB binding runs under the database emulator in `parity-rtdb` (isolated job so a DB-emulator config issue can't mask Firestore parity). Clock-EXPIRY behaviour intentionally not asserted (memory injected clock vs RTDB wall-clock).

### ✅ Foundation 4 — End-to-end money conservation (DONE)
`web/src/server/money-conservation.test.ts`: settles a spread of impressions (odd CPMs → rounding) through the real CounterStore → `runFlushCycle` → ledger + balances + budgets, and asserts: per-impression + global `revenue == credit + retention`; ledger credit sum == balances; balances land in the HELD bucket (`balance == held`, available 0); budgets decremented by the rounded revenue; hot-path pending cleared after ack (money in exactly one place); maturation moves held→available with total unchanged. Runs on memory (fast lane); the parity contracts carry the guarantee to prod adapters.

### ✅ Foundation 5 — Scheduler (DONE)
`.github/workflows/fraud-scan.yml`: scheduled (every 6h) host-agnostic POST to `/api/internal/fraud-scan` with `{"enforce": true}` + Bearer secret — activating the orphaned clawback. 6h is strictly < the 3-day hold (the load-bearing invariant), so a farm is scanned ~12× while still held/voidable. No-ops (exit 0) until `PROD_BASE_URL` + `SPINSHARE_FRAUD_SCAN_SECRET` repo secrets are set, so it never shows a false red. Maturation is intentionally NOT scheduled — it is lazy-at-payout (correct without a cron); a maturation sweep would only be display hygiene and needs a "list users with held" query, so it's deferred (YAGNI).

### ⬜ Foundation 6 — Promote held/available to explicit source-of-truth
ONLY if #3/#4 show the derived `available = balanceCents − heldCents` invariant is fragile. Don't do speculatively (YAGNI).

## Pay-downs (existing band-aids)
- Lazy-only maturation → covered by the scheduler (#5) so `heldCents` doesn't go stale for non-withdrawing users.
- core→`dist` rebuild footgun: editing core needs a manual `npm run build` before web typechecks (hit repeatedly this session). Fix: web consumes core via TS project references / a `src` path alias.

## Ops / observability
- Structured log + metric when a payout risk gate trips or fails open (they degrade silently today).
- Alert when a flush batch is permanently nacked (= stranded earnings).
- Periodic reconciliation audit (ledger vs balances vs Stripe) that pages on drift.

## Explicitly NOT worth doing (anti-gold-plating)
- Token revocation / jti (3f) — hot-path cost, no anti-Sybil value.
- Structural identity-cost change (proof-of-work / KYC) — right *eventual* answer *if* real abuse appears; pre-building it now is over-engineering. Payout-boundary controls + hold are sufficient containment until there's abuse data.
- More anti-fraud tiers (2d profilers) — diminishing returns; the wall is built.
- Money-model rewrite "to be clean" — overlay is fine if #3/#4 pass.

## Meta-process note
This session saw repeated **transient** test failures from concurrent edits on a live tree (connect route, market row, layout signup-bonus). That is the strongest argument for the CI gate (#1): CI runs on a committed, consistent snapshot, so half-applied edits can't masquerade as regressions — and real regressions can't merge.
