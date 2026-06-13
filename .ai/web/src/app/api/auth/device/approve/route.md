# api/auth/device/approve/route.ts

> Last updated: 2026-06-13 | Protection: PROTECTED

## Purpose（一句话人话）

设备授权的「批准/拒绝」服务端入口：浏览器里已登录的用户对某个 `userCode` 点 Approve/Deny，本路由用会话身份调用 AuthProvider 签发或拒绝 token。

## What It Does

- `POST /api/auth/device/approve` with JSON body `{ userCode: string, decision: "approve" | "deny" }`.
- Resolves the current user from the NextAuth session (`auth()`); requires `session.user.id`.
- `401 { error: "not_authenticated" }` when there is no session.
- `400 { error: "invalid_request" }` for a malformed body / missing userCode / bad decision.
- approve → `getContainer().auth.approveDeviceByUserCode(userCode, { userId, email })` → `200 { approved: true }`.
- deny → `getContainer().auth.denyDeviceByUserCode(userCode)` → `200 { approved: false }`.
- Unknown/expired user code (provider throws) → `404 { error: "unknown_user_code" }`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | Route handler | Approve or deny a pending device flow |

## Dependencies

- **Internal:** `@/server/container` (`getContainer`) — the composition-root AuthProvider.
- **Internal:** `@/server/adapters/auth/nextauth-config` (`auth`) — session.

## Important Notes / NEVER Change

- The approver identity is ALWAYS taken from the server session — never trust a client-provided user id.
- Mints a real Device_Auth_Token via the provider (mock: in-memory map; oauth: HMAC-signed).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created approve/deny endpoint for the device flow | Kiro |
