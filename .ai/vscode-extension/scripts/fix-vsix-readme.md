# fix-vsix-readme.mjs

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Legacy standalone script that rewrites README entry casing inside an existing
VSIX archive.

## What It Does

- Selects the newest `.vsix` in `vscode-extension/`.
- Renames README entries with `adm-zip`.
- Rewrites the full archive in place.

## Dependencies

- External: `adm-zip` for ZIP mutation.

## Agent Decisions / Thoughts

- **2026-06-20 Codex:** This approach is unsafe for VSIX/OPC packages. `vsce`
  deliberately writes the primary README as `extension/readme.md` and records
  that exact path in `extension.vsixmanifest`. Renaming only the archive entry
  creates a case-sensitive mismatch, while rewriting the archive introduces a
  second non-official packaging implementation.

## Important Notes / NEVER Change

- Do not post-process an archive produced by `vsce`.
- Manifest asset paths and archive entry names must match exactly.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-20 | Marketplace reports the generated VSIX as malformed/corrupted. | This script rewrites the official `vsce` archive and changes README casing without updating the manifest asset path. | Delete the script and use unmodified `vsce` output. |

## Planned Deletion 2026-06-20

Delete this dead, unsafe script together with its code-file counterpart after
the package-flow regression test covers the immutable-output requirement.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Documented Marketplace failure and planned synchronized deletion. | Codex |
