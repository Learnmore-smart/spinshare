#!/usr/bin/env python3
"""Generate French terms/fr.tsx from en.tsx."""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from terms_fr_sections import SECTIONS_FR  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
EN_PATH = REPO_ROOT / "web" / "src" / "lib" / "i18n" / "legal" / "terms" / "en.tsx"
FR_PATH = REPO_ROOT / "web" / "src" / "lib" / "i18n" / "legal" / "terms" / "fr.tsx"

SECTION_PATTERN = re.compile(
    r"(<LegalSection id=\{(\d+)\}.*?</LegalSection>)",
    re.DOTALL,
)


def _replace_sections(en_text: str) -> str:
    missing: list[int] = []

    def replacer(match: re.Match[str]) -> str:
        section_id = int(match.group(2))
        fr_block = SECTIONS_FR.get(section_id)
        if fr_block is None:
            missing.append(section_id)
            return match.group(1)
        return fr_block

    result = SECTION_PATTERN.sub(replacer, en_text)
    if missing:
        raise SystemExit(f"Missing French translations for sections: {sorted(missing)}")
    return result


def main() -> None:
    en_text = EN_PATH.read_text(encoding="utf-8")

    if "TermsBodyEn" not in en_text:
        raise SystemExit("Expected TermsBodyEn export in en.tsx")
    if en_text.count("<LegalSection id=") != 22:
        raise SystemExit("Expected 22 LegalSection blocks in en.tsx")
    if len(SECTIONS_FR) != 22:
        raise SystemExit(f"Expected 22 translated sections, found {len(SECTIONS_FR)}")

    fr_text = en_text.replace("TermsBodyEn", "TermsBodyFr")
    fr_text = _replace_sections(fr_text)

    if "These Terms of Service" in fr_text:
        raise SystemExit("English body text remains in output")
    if "Conditions d" not in fr_text:
        raise SystemExit("Expected French intro in output")
    if fr_text.count("<LegalSection id=") != 22:
        raise SystemExit("Output must contain 22 LegalSection blocks")

    FR_PATH.write_text(fr_text, encoding="utf-8")
    line_count = fr_text.count("\n") + 1
    print(f"Wrote {FR_PATH.relative_to(REPO_ROOT)} ({line_count} lines)")


if __name__ == "__main__":
    main()
