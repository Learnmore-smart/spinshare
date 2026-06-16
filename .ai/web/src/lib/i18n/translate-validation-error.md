# translate-validation-error.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Maps validation helper error strings to localized dictionary messages.

## What It Does

- Converts pure helper validation messages from dashboard code into locale-aware
  strings.
- Keeps helper functions framework-free while still rendering localized errors
  in React components.

## Implemented Change 2026-06-15 Block Funding Errors

Added mappings for dashboard block funding validation errors:

- `Enter a whole number of blocks.`
- `Buy at least 1 block.`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created mirror doc for block funding validation translation. | Codex |
