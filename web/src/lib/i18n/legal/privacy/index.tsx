"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import { PrivacyBodyEn } from "./en";
import { PrivacyBodyFr } from "./fr";
import { PrivacyBodyZh } from "./zh";

export function PrivacyBody() {
  const locale = useLocale();
  switch (locale) {
    case "zh":
      return <PrivacyBodyZh />;
    case "fr":
      return <PrivacyBodyFr />;
    default:
      return <PrivacyBodyEn />;
  }
}
