"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Code, Layers, Sparkles } from "lucide-react";

type SignInRole = "developer" | "advertiser";

interface RoleSearchParams {
  get(name: string): string | null;
}

export function resolveInitialRole(searchParams: RoleSearchParams): SignInRole {
  return searchParams.get("role") === "advertiser" ? "advertiser" : "developer";
}

function SignInForm() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<SignInRole>(() => resolveInitialRole(searchParams));
  const [customUserId, setCustomUserId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Read callbackUrl from query params, or default to the role-specific dashboard
  const callbackUrl =
    searchParams.get("callbackUrl") ||
    (role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser");

  const handleOAuthSignIn = async (provider: string) => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error("Authentication failed:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleMockSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("mock");
    const userId = customUserId.trim() || (role === "developer" ? "mock-developer" : "mock-advertiser");
    try {
      await signIn("credentials", {
        userId,
        role,
        callbackUrl,
      });
    } catch (error) {
      console.error("Mock credentials sign-in failed:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-50/50 p-4 sm:p-6 overflow-hidden">
      {/* Premium ambient animated background blobs */}
      <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-violet-200/30 blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-indigo-200/30 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="z-10 w-full max-w-[420px] space-y-6">
        {/* Navigation link back to homepage */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-100/50 backdrop-blur-md">
          <CardHeader className="space-y-2 text-center">
            {/* Logo */}
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Sign in to SpinShare
            </CardTitle>
            <CardDescription className="text-slate-500">
              Choose your role below to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Switcher tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setRole("developer")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
                  role === "developer"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code className="h-4 w-4" />
                Developer
              </button>
              <button
                type="button"
                onClick={() => setRole("advertiser")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
                  role === "advertiser"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4" />
                Advertiser
              </button>
            </div>

            {/* Main Sign-In Buttons */}
            <div className="space-y-3">
              {/* GitHub OAuth */}
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={loading !== null}
                className="w-full justify-center gap-3 border-slate-200 bg-white py-6 font-medium text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                {loading === "github" ? "Signing in..." : "Continue with GitHub"}
              </Button>

              {/* Google OAuth */}
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={loading !== null}
                className="w-full justify-center gap-3 border-slate-200 bg-white py-6 font-medium text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading === "google" ? "Signing in..." : "Continue with Google"}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Local Testing
              </span>
            </div>

            {/* Mock Local Sign-in Form */}
            <form onSubmit={handleMockSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="userId" className="text-xs font-semibold text-slate-700">
                  Custom User ID (Optional)
                </label>
                <input
                  id="userId"
                  type="text"
                  placeholder={role === "developer" ? "mock-developer-1" : "mock-advertiser-1"}
                  value={customUserId}
                  onChange={(e) => setCustomUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading !== null}
                className="w-full justify-center bg-violet-600 text-white shadow-md hover:bg-violet-700"
              >
                {loading === "mock" ? "Signing in..." : `Sign in as ${role === "developer" ? "Developer" : "Advertiser"} (Mock)`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support disclaimer info */}
        <p className="text-center text-xs text-slate-400">
          In local development mode, mock credentials bypass external OAuth configs to provide a fully testable local experience.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
          Loading authentication...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
