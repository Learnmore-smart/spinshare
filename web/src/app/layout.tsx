import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nunito } from "next/font/google";

import "./globals.css";
import "./theme.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpinShare",
  description: "Your AI is thinking. You should be earning.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // `light` activates the premium light theme by default; body classes
  // pull the soft slate background + dark slate foreground tokens.
  return (
    <html lang="en" className={`light ${nunito.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
