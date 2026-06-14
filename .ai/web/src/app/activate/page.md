# activate/page.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose（一句话人话）

设备登录授权页：开发者在浏览器里确认 CLI/扩展发起的 device-flow 登录，点击「Approve Device」后服务器签发 Device_Auth_Token，CLI 轮询拿到 token 完成登录。

## What It Does

- Server component reads `user_code` from the URL query (`?user_code=WXYZ-1234`) and resolves the current NextAuth session via `auth()`.
- If the visitor is NOT signed in: shows a prompt with a link to `/signin?callbackUrl=/activate?user_code=...` so they return here after authenticating.
- If signed in: renders the client component `ActivateClient`, pre-filled with the user code and the signed-in email.
- `ActivateClient` (client component) shows Approve / Deny buttons that POST to `/api/auth/device/approve`, then displays success ("return to your terminal"), denial, or error states.
- Works in both `AUTH_MODE=mock` (local test accounts via credentials sign-in) and `AUTH_MODE=oauth` (Google/GitHub), because identity always comes from the NextAuth session.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ActivatePage` (default) | Next.js page (server) | Route `/activate` |

## Dependencies

- **Internal:** `@/server/adapters/auth/nextauth-config` (`auth`) — resolve session.
- **Internal:** `./activate-client` — interactive approve/deny UI.
- **External:** `next/navigation`, `next/link`.

## Important Notes / NEVER Change

- Identity for approval MUST come from the server session, never from a client-supplied user id (prevents approving as someone else).
- The page only sends `userCode` + decision to the API; the server derives the approver identity.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created activate page to close the device-flow login gap | Kiro |
| 2026-06-14 | Restyled to emerald theme.css (match /signin); removed cyberpunk cyan grid | Codex |
| 2026-06-14 | Dark theme: card + typography use theme vars and `dark:` Tailwind classes | Codex |
