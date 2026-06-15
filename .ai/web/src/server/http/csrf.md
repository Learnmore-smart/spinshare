# csrf.ts

> Protection: PROTECTED (guards money-moving routes)

## Purpose（一句话人话）
Same-origin CSRF guard for state-changing, cookie-authenticated API routes (the payout endpoints). Rejects cross-origin/origin-less POSTs.

## Public API
| Name | Type | Description |
|------|------|-------------|
| allowedOrigins(request, env?) | fn | origins considered "ours": request URL origin, Host (+X-Forwarded-Proto), configured AUTH_URL/NEXTAUTH_URL/APP_URL/NEXT_PUBLIC_APP_URL |
| isSameOrigin(request, env?) | fn → boolean | matches Origin header, falls back to Referer host; false if neither present |
| assertSameOrigin(request, env?) | fn → Response\|null | 403 `forbidden_origin` when not same-origin, else null |

## Dependencies
- None (pure header inspection).

## Important Notes / NEVER Change
- OWASP-recommended primary CSRF defense for cookie-authed APIs: browsers can't forge/omit their own Origin.
- Call `assertSameOrigin` FIRST in money-moving handlers, before any side effect.
- NextAuth's built-in CSRF only covers `/api/auth/*`, not custom routes — hence this.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created | Kiro |
