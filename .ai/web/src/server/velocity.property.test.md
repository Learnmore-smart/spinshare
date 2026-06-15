# velocity.property.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Property tests for velocity limits and shadow-ban behavior in the ledger
service.

## Planned Change

Update the shadow-ban success-shape assertion after `recordImpression` gained an
internal `settlement` field. The public response body must stay unchanged while
the internal settlement reason can identify shadow-ban suppression for aggregate
telemetry.

## Implemented Change

The property now asserts `result.response` remains the public success shape and
`result.settlement` identifies shadow-ban suppression.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned assertion update for internal settlement reason. | Codex |
| 2026-06-15 | Implemented assertion update for internal settlement reason. | Codex |
