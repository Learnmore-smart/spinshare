# activate/activate.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose（一句话人话）

设备授权页 `/activate` 的样式：页面背景与玻璃卡片，与 sign-in 页 emerald 主题一致，并支持 `.dark` 暗色模式。

## What It Does

- `.spinshare-activate-page` — 页面容器，使用 `theme.css` 的 `--bg-page` / `--text-primary`。
- `.spinshare-activate-card` — 居中玻璃卡片；亮色为白绿渐变，暗色为 slate/emerald 半透明玻璃（与 `home.css` 的 `.dark .liquid-glass` 一致）。

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | 暗色模式下卡片仍为浅色、正文对比度差 | 卡片样式写死亮色 rgba，未覆盖 `.dark` | 增加 `.dark .spinshare-activate-card` 规则；TSX 补充 `dark:` 文本类 |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created; added dark-mode card overrides | Codex |
