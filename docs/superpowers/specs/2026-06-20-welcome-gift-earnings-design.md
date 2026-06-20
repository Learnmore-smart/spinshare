# Welcome Gift Earnings Visibility

## Goal

Display the existing one-time $1 signup bonus as a real earning everywhere a
developer reviews credited income:

- The earnings curve starts at $1.00 on the signup-bonus timestamp, even when
  the developer has no impressions.
- Recent credit includes one welcome-gift row with a `+$1.00` amount.
- The row name is localized for English, Simplified Chinese, and French.

The bonus remains excluded from impression counts while continuing to count
toward the balance and payout threshold.

## Existing Behavior and Root Cause

`grantSignupBonus()` already writes an idempotent `signup_bonus` ledger entry
with 100 cents and updates the user's balance. `summarizeLedger()` also includes
that row in totals and chart rows.

Two presentation boundaries hide it:

1. The earnings view shows its empty state when `impressionCount === 0`, even
   when the ledger-derived chart series contains the signup bonus.
2. Recent credit loads only impression and payout activity records from the
   activity repository. The signup bonus exists only in the ledger, so it is
   never returned by that feed.

## Chosen Design

Keep the durable signup-bonus ledger entry as the single source of truth. The
developer dashboard layout will derive one welcome-gift activity source from
the summarized ledger data and pass it to the activity provider as a pinned
row. The provider will merge that row with fetched and paginated activity rows
using the existing activity-id de-duplication path.

This avoids a second persistent write, backfill work for existing recipients,
and cross-repository consistency problems.

### Earnings Curve

The earnings view will decide whether to render the chart from the filtered
chart series, not from the impression count. A signup-bonus-only account will
therefore render a one-point series at `$1.00`. Impression count and event KPIs
remain unchanged.

### Recent Credit

The ledger activity row will carry:

- Stable id: the existing deterministic signup-bonus ledger entry id.
- Timestamp: the ledger entry's `createdAtMs`.
- Type/status: a welcome-gift developer credit recognized by the shared
  activity normalizer.
- Campaign: no campaign association; the presentation uses an em dash.
- Event label: localized welcome-gift copy.
- Credit: `+$1.00`.

The row is sorted with normal activity by timestamp and is preserved when more
pages load. Stable-id merging guarantees that it appears once.

### Localization

Add typed copy for the welcome-gift event in every supported locale:

- English: `Welcome gift`
- Simplified Chinese: `欢迎礼金`
- French: `Cadeau de bienvenue`

The feed formatter, search, mobile list, desktop table, and CSV export all use
the localized normalized label.

## Data Flow

1. Dashboard layout grants the bonus idempotently and reads the developer
   ledger.
2. `summarizeLedger()` exposes the bonus as a ledger row with its timestamp and
   credit.
3. The layout derives the pinned welcome-gift activity source and passes it to
   `DeveloperActivityProviderClient`.
4. The provider fetches the normal activity API and merges the pinned source by
   stable id before sorting newest-first.
5. The activity view renders and exports the merged rows through existing
   components.
6. The earnings view renders any non-empty ledger-derived chart series,
   including a bonus-only series.

## Error Handling and Compatibility

- If no signup-bonus ledger row exists, no pinned welcome-gift activity is
  created and current behavior remains unchanged.
- A missing bonus timestamp falls back to the existing sequence label in the
  chart; no fabricated timestamp is persisted.
- Activity API failures still show the existing error state. The pinned row is
  not used to disguise a failed activity request.
- Existing payout and impression activity shapes remain compatible.
- No database schema migration or historical backfill is required.

## Testing

Follow test-driven development with focused failing tests before production
changes:

1. Ledger summary identifies enough bonus metadata to build the pinned row.
2. A bonus-only account produces a `$1.00` chart point and does not trigger the
   earnings empty state.
3. Activity normalization renders the localized welcome-gift label and
   `+$1.00`.
4. Initial load and load-more merging keep exactly one welcome-gift row.
5. Search and CSV output include the localized label.
6. Existing impression counts remain zero for bonus-only accounts.
7. Focused dashboard tests, the full web test suite, and TypeScript lint pass.

## Out of Scope

- Changing the $1 amount, eligibility, grant timing, or idempotency behavior.
- Counting the welcome gift as an impression.
- Writing signup bonuses to the activity repository.
- Changing payout accounting or minimum payout rules.
