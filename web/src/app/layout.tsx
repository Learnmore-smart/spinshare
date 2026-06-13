import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpinShare",
  description: "Your AI is thinking. You should be earning.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // `dark` activates the cyberpunk dark theme (darkMode: "class"); body classes
  // pull the near-black background + neon-green foreground tokens.
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-mono text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
