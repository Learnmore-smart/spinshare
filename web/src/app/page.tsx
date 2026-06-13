import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * SpinShare landing page (task 12.2).
 *
 * A server component rendering the value proposition (R7.1) and two distinct,
 * visible sign-in controls — Developer and Advertiser (R7.2). Each control is a
 * link to the NextAuth browser sign-in route, so activating either one
 * initiates the browser-based authentication flow (R7.3 / R7.4). We pass a
 * role-specific `callbackUrl` so each entry point lands on the matching
 * dashboard after a successful sign-in.
 *
 * Links (rather than client-side `signIn()` calls) keep this a stable server
 * component with no client bundle, while still visibly initiating auth.
 */

const DEVELOPER_SIGNIN_HREF =
  "/api/auth/signin?callbackUrl=%2Fdashboard%2Fdeveloper";
const ADVERTISER_SIGNIN_HREF =
  "/api/auth/signin?callbackUrl=%2Fdashboard%2Fadvertiser";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <section className="flex max-w-2xl flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          The developer-first ad exchange
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-primary [text-shadow:0_0_18px_hsl(var(--neon)/0.6)] sm:text-6xl">
          SpinShare
        </h1>
        <p className="text-balance text-2xl font-medium text-foreground sm:text-3xl">
          Your AI is thinking. You should be earning.
        </p>
        <p className="text-balance text-base text-muted-foreground">
          SpinShare turns the wait states of AI coding agents into revenue. While
          your AI generates output, we show a short ad in place of the spinner —
          developers earn their share of advertiser spend, advertisers reach
          builders where they work.
        </p>
      </section>

      <section className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <Card className="flex flex-col text-left">
          <CardHeader>
            <CardTitle className="text-primary">For Developers</CardTitle>
            <CardDescription>
              Earn 60% of advertiser spend on every impression shown during your
              AI wait states.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full">
              <Link href={DEVELOPER_SIGNIN_HREF}>Developer sign-in</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col text-left">
          <CardHeader>
            <CardTitle className="text-primary">For Advertisers</CardTitle>
            <CardDescription>
              Launch campaigns, fund budgets, and reach developers right inside
              their tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline" className="w-full">
              <Link href={ADVERTISER_SIGNIN_HREF}>Advertiser sign-in</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
