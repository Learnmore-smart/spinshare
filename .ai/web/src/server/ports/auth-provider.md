# auth-provider.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Port definitions for device-flow auth, validated token claims, and browser
session approval identity.

## Notes

`AuthClaims` already supports optional `email`, `provider`, and `role`. The
homepage checkout claim path relies on the `email` claim being present in the
dashboard bearer token.

## Current Bug 2026-06-16

The port type itself is not wrong; the bug is in the production direct token
mint path not preserving optional claims. This doc exists because the fix may
import or reference `AuthClaims`/`DeviceApproval` types while keeping the port
contract stable.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Documented advertiser dashboard token email-claim dependency. | Codex |
