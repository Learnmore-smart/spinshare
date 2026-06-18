# route.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Side-effect-free validation endpoint for Device_Auth_Token bearer tokens.

## What It Does

- Reads the `Authorization: Bearer <token>` header.
- Delegates to the configured auth provider's `validateToken`.
- Returns `200 { valid: true }` for a valid token.
- Returns `401 { valid: false }` for missing, malformed, invalid, or rejected tokens.
- Does not bid, create impression progress, increment telemetry, or mutate auth state.

## Agent Decisions / Thoughts

- 2026-06-16 Codex: This endpoint exists so the extension can verify stored tokens on activation without using `/api/ad`. `/api/ad` is not appropriate for auth probing because it can create progress markers and show telemetry.

## Important Notes / NEVER Change

- Keep this endpoint side-effect-free.
- Do not return user profile data from this endpoint; it is only a token health check.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented side-effect-free validation endpoint returning `valid` booleans. | Codex |
| 2026-06-16 | Created plan for side-effect-free device-token validation route. | Codex |
