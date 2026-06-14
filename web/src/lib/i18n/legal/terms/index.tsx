"use client";

import type { Dictionary } from "@/lib/i18n/types";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import { TermsBodyEn } from "./en";
import { TermsBodyFr } from "./fr";
import { TermsBodyZh } from "./zh";

function TermsBody({ titles }: { titles: Dictionary["terms"]["sectionTitles"] }) {
  const locale = useLocale();
  switch (locale) {
    case "zh":
      return <TermsBodyZh titles={titles} />;
    case "fr":
      return <TermsBodyFr titles={titles} />;
    default:
      return <TermsBodyEn titles={titles} />;
  }
}

export function TermsArticle() {
  const t = useT();
  return (
    <article className="space-y-12 text-[15px] leading-7 text-slate-700">
      <TermsBody titles={t.terms.sectionTitles} />
    </article>
  );
}
