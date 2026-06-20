# verify-vsix.mjs

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Validates a completed VSIX without modifying the archive.

## What It Does

- Confirms required OPC entries exist.
- Reads `extension.vsixmanifest` and resolves its primary README asset path.
- Requires an exact, case-sensitive archive entry match for that path.
- Requires the bundled PTY package manifest, JavaScript entrypoint, and at
  least one native `.node` runtime binary.
- Rejects debug symbols and native source/build payloads that should not ship.
- Returns a concise validation summary for package scripts and diagnostics.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `validateVsixContents` | Function | Validates an entry-name list and manifest XML without filesystem I/O. |
| `verifyVsixFile` | Function | Reads and validates a VSIX file without writing it. |

## Dependencies

- External: `adm-zip`, read-only entry/data access only.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** Validation belongs after official `vsce` packaging.
  The validator must not normalize names, recompress data, or write the file.
  Exact casing is part of the asset-reference contract.

## Important Notes / NEVER Change

- Never call `addFile`, `deleteFile`, or `writeZip` from this module.
- Do not accept case-insensitive asset matches.

## Planned Change 2026-06-20

Add a pure validation core plus a read-only file adapter, and invoke it from
the package variant flow immediately after `vsce` returns.

## Implemented Change 2026-06-20

Implemented `validateVsixContents()` and `verifyVsixFile()`. The file adapter
uses `adm-zip` only for `getEntries()` and `getData()`; it contains no archive
write operation. Packaging invokes the validator before reporting success.

Verification:
- Five focused validator tests pass.
- Prod and local artifacts each validated with 101 entries and exact
  `extension/readme.md` linkage.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented and verified read-only VSIX validation. | Codex |
| 2026-06-20 | Created validation design before implementation. | Codex |
