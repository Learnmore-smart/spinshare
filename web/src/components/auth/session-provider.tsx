"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Wraps the app so client components can read the NextAuth session (JWT cookie). */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
