# verify-vsix.test.mjs

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Regression tests for Marketplace-safe VSIX structure validation.

## Planned Coverage

- Accept a manifest whose lowercase README asset has an exact archive entry.
- Reject the historical mismatch where the manifest says `readme.md` but the
  archive contains only `README.md`.
- Reject missing required OPC entries.
- Reject an archive that trims away the PTY manifest, JavaScript entrypoint, or
  all native `.node` binaries.
- Reject packaged `.pdb` debug symbols and native source/build files.

## Dependencies

- Internal: `verify-vsix.mjs` pure validation API.
- External: Vitest.

## Implemented Coverage

Five tests cover valid exact README linkage, historical case mismatch, required
OPC entries, required PTY runtime files/native binary, and prohibited debug or
source payloads.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented five passing VSIX structure regression tests. | Codex |
| 2026-06-20 | Created regression-test plan before implementation. | Codex |
