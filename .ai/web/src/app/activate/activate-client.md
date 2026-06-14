# activate/activate-client.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose（一句话人话）

`/activate` 页面里的交互组件：已登录用户在这里确认设备码并点 Approve/Deny，向后端发请求签发或拒绝 token。

## What It Does

- Client component. Auto-fills the `user_code` from `initialUserCode` but keeps it editable (manual-entry fallback).
- Approve/Deny buttons POST `{ userCode, decision }` to `/api/auth/device/approve`.
- Renders a state machine: idle (form) → submitting → approved / denied / error.
- On approve: shows "return to your terminal" success. On error: maps API error codes to friendly text.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ActivateClient` | React component | Approve/deny control |
| `ActivateClientProps` | interface | `{ initialUserCode: string; email: string \| null }` |

## Dependencies

- **External:** `react` (`useState`), browser `fetch`.

## Important Notes / NEVER Change

- Sends only the user code + decision; never a user id (server derives identity from session).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created interactive approve/deny client | Kiro |
| 2026-06-14 | Dark theme: `dark:` text/surface classes on all status states | Codex |
