# Terms of Service — Simplified Chinese (`zh.tsx`)

## Purpose
Full Simplified Chinese translation of `web/src/lib/i18n/legal/terms/en.tsx`.

## Structure
- Export: `TermsBodyZh({ titles }: { titles: Dictionary["terms"]["sectionTitles"] })`
- Imports: `Dictionary` from `@/lib/i18n/types`; `LegalSection`, `LegalSubsection`, `codeClass` from `../shared`
- Main section titles come from `titles[N]` props (not hardcoded)
- `LegalSubsection title="..."` strings translated to Chinese
- Product names, emails, URLs, form names (W-9, Stripe, etc.) kept as in English source

## Generation
Run from repo root:

```bash
python scripts/translate_terms_zh.py
```

`scripts/translate_terms_zh.py` reads `en.tsx`, renames `TermsBodyEn` → `TermsBodyZh`, swaps each `LegalSection` block using `scripts/terms_zh_sections.py`, and writes `zh.tsx`.

## Status
Complete Simplified Chinese translation mirroring all 22 sections of `en.tsx`.
