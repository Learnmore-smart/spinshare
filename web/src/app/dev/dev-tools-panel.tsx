"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  ArrowRight,
  Code,
  Home,
  Layers,
  LogIn,
  Zap,
} from "lucide-react";

const DEV_ACCOUNTS = {
  developer: { email: "developer@spinshare.test", password: "spinshare" },
  advertiser: { email: "advertiser@spinshare.test", password: "spinshare" },
} as const;

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signin", label: "Sign In", icon: LogIn },
  { href: "/dashboard/developer", label: "Developer Dashboard", icon: Code },
  { href: "/dashboard/advertiser", label: "Advertiser Dashboard", icon: Layers },
  { href: "/activate", label: "Device Activation", icon: Zap },
] as const;

export function DevToolsPanel({ showQuickSignIn }: { showQuickSignIn: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSignIn = async (role: "developer" | "advertiser") => {
    setError(null);
    setLoading(role);
    const callbackUrl =
      role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser";
    try {
      const result = await signIn("credentials", {
        email: DEV_ACCOUNTS[role].email,
        password: DEV_ACCOUNTS[role].password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError(
          `Failed to sign in as ${role}. Credentials provider may not be enabled.`,
        );
        return;
      }
      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        Dev <span className="spinshare-hero-highlight-3d">Tools</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">
        Quick sign-in and navigation for local development.
      </p>

      {error ? <p className="dev-error mt-4">{error}</p> : null}

      <div className="dev-tools-grid mt-6">
        {showQuickSignIn
          ? (["developer", "advertiser"] as const).map((role) => {
              const Icon = role === "developer" ? Code : Layers;
              return (
                <button
                  key={role}
                  type="button"
                  className="dev-tools-btn"
                  onClick={() => handleQuickSignIn(role)}
                  disabled={loading !== null}
                >
                  <span className="dev-tools-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="dev-tools-meta">
                    <span className="dev-tools-label">
                      Sign in as {role === "developer" ? "Developer" : "Advertiser"}
                    </span>
                    <span className="dev-tools-sub">{DEV_ACCOUNTS[role].email}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              );
            })
          : null}

        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="dev-tools-link">
            <span className="dev-tools-icon">
              <Icon className="h-4 w-4" />
            </span>
            <span className="dev-tools-meta">
              <span className="dev-tools-label">{label}</span>
              <span className="dev-tools-sub">{href}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
