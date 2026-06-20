# market-delivery-progress.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Renders one campaign's exact delivered-versus-purchased impression progress in the public market table.

## What It Does

- Formats settled and purchased impression counts.
- Renders a compact blue progress fill on a neutral track.
- Exposes native progressbar ARIA semantics and a localized accessible label.
- Clamps invalid visual percentages without changing the exact numeric counts.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MarketDeliveryProgress` | React component | Public leaderboard delivery cell. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `servedImpressions` | number | Yes | Durable settled impression count. |
| `purchasedImpressions` | number | Yes | Effective cumulative purchase total. |
| `deliveryPercent` | number | Yes | Server-calculated percentage. |
| `ariaLabel` | string | Yes | Localized progress description. |

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Use exact text plus one sequential blue bar; color is not the only encoding and no animation implies activity that did not occur.

## Important Notes / NEVER Change

- Never infer delivery from client time or fake progress.
- Keep the numeric label visible and tabular.
- Keep the component presentation-only; API semantics belong to `/api/market`.

## Planned Change 2026-06-20

Create the component for the new right-hand Delivery column.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created before component implementation. | Codex |
