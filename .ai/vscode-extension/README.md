# README.md

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Marketplace/user-facing README for the SpinShare VS Code-compatible extension.

## What It Does

- Explains extension features and setup.
- Documents sign-in and terminal auto-wrap behavior.
- Lists commands and configuration settings.

## Public API

| Name | Type | Description |
|------|------|-------------|
| README | Markdown | Displayed in VS Code extension views and VSIX metadata. |

## Dependencies

- Internal: extension commands and configuration in `package.json`.

## Important Notes / NEVER Change

- Do not claim that external terminals are affected; VS Code environment collections only apply to new integrated terminals.
- Do not claim impressions are credited without sign-in and a funded campaign.

## Planned Change

Update README to reflect terminal auto-wrap now being bundled with the extension package and clarify that users must open a new integrated terminal after install/sign-in.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created README doc and documented terminal setup fix. | Codex |
