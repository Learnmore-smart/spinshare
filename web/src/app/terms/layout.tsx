import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · SpinShare",
  description:
    "Terms governing your use of the SpinShare VS Code extension, CLI wrapper, and spinshare-web-vert.vercel.app website.",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
