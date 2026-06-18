# credential-store.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Unit tests for CLI credential storage implementations.

## Planned Change

Add RED coverage that a `FileCredentialStore` constructed with a `baseUrl` writes that base URL into the JSON file while still loading the token through the existing `load()` API.

## Planned Change 2026-06-17

Add RED coverage for strict base URL separation: when a credential store is constructed with a concrete `baseUrl`, legacy untagged file credentials and legacy bare keytar values must load as `null` instead of being reused ambiguously.

## Implemented Change 2026-06-17

Added tests proving configured file and keytar stores reject ambiguous legacy values, while unconfigured legacy callers can still read those values.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added strict baseUrl tests for rejecting untagged legacy credentials in configured stores. | Codex |
| 2026-06-17 | Planned strict baseUrl tests for rejecting untagged legacy credentials in configured stores. | Codex |
| 2026-06-16 | Added tests that file credential writes can include baseUrl metadata while `load()` still returns only the token. | Codex |
| 2026-06-16 | Created doc before adding baseUrl metadata test coverage. | Codex |
