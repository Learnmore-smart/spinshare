#!/usr/bin/env python3
"""Generate Simplified Chinese terms/zh.tsx from en.tsx.

Reads en.tsx, renames TermsBodyEn to TermsBodyZh, replaces each LegalSection
block with its Simplified Chinese translation, and writes zh.tsx.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from terms_zh_sections import SECTIONS_ZH  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
EN_PATH = REPO_ROOT / "web" / "src" / "lib" / "i18n" / "legal" / "terms" / "en.tsx"
ZH_PATH = REPO_ROOT / "web" / "src" / "lib" / "i18n" / "legal" / "terms" / "zh.tsx"

SECTION_PATTERN = re.compile(
    r"(<LegalSection id=\{(\d+)\}.*?</LegalSection>)",
    re.DOTALL,
)


def _replace_sections(en_text: str) -> str:
    missing: list[int] = []

    def replacer(match: re.Match[str]) -> str:
        section_id = int(match.group(2))
        zh_block = SECTIONS_ZH.get(section_id)
        if zh_block is None:
            missing.append(section_id)
            return match.group(1)
        return zh_block

    result = SECTION_PATTERN.sub(replacer, en_text)
    if missing:
        raise SystemExit(f"Missing Chinese translations for sections: {sorted(missing)}")
    return result


def main() -> None:
    en_text = EN_PATH.read_text(encoding="utf-8")

    if "TermsBodyEn" not in en_text:
        raise SystemExit("Expected TermsBodyEn export in en.tsx")
    if en_text.count("<LegalSection id=") != 22:
        raise SystemExit("Expected 22 LegalSection blocks in en.tsx")
    if len(SECTIONS_ZH) != 22:
        raise SystemExit(f"Expected 22 translated sections, found {len(SECTIONS_ZH)}")

    zh_text = en_text.replace("TermsBodyEn", "TermsBodyZh")
    zh_text = _replace_sections(zh_text)

    if "These Terms of Service" in zh_text:
        raise SystemExit("English body text remains in output")
    if "本服务条款" not in zh_text:
        raise SystemExit("Expected Simplified Chinese intro in output")
    if zh_text.count("<LegalSection id=") != 22:
        raise SystemExit("Output must contain 22 LegalSection blocks")

    ZH_PATH.write_text(zh_text, encoding="utf-8")
    line_count = zh_text.count("\n") + 1
    print(f"Wrote {ZH_PATH.relative_to(REPO_ROOT)} ({line_count} lines)")


if __name__ == "__main__":
    main()
