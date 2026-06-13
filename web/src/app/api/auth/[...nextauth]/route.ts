/**
 * NextAuth (Auth.js) catch-all route — mounts the browser sign-in/callback
 * handlers for Google + GitHub (R4.3).
 *
 * The handlers come from {@link authConfig}'s `NextAuth(...)` instance. When no
 * OAuth credentials are configured the provider list is empty, so the route
 * mounts cleanly and simply offers no providers — the build never breaks on
 * missing credentials. See `web/src/server/adapters/auth/nextauth-config.ts`.
 */

import { handlers } from "@/server/adapters/auth/nextauth-config";

export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
