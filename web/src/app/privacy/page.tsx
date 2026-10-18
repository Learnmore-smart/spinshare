import type { Metadata } from "next";
import { PrivacyPageClient } from "./PrivacyPageClient";

export const metadata: Metadata = {
  title: "Privacy Policy · SpinShare",
  description:
    "How SpinShare collects, uses, and protects information across the VS Code extension, CLI wrapper, and spinshare-web-vert.vercel.app website.",
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
