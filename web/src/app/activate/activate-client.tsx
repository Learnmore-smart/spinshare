"use client";

/**
 * Interactive approve/deny control for the `/activate` page.
 *
 * Rendered only for a signed-in developer. Auto-fills the `user_code` from the
 * URL (passed in as {@link ActivateClientProps.initialUserCode}) but keeps it
 * editable as a manual-entry fallback. Approving or denying POSTs the user code
 * + decision to `POST /api/auth/device/approve`; the server derives the approver
 * identity from the session and mints (or refuses) the Device_Auth_Token.
 */

import { useState } from "react";

/** Props for {@link ActivateClient}. */
export interface ActivateClientProps {
  /** User code parsed from `?user_code=...` (may be empty). */
  initialUserCode: string;
  /** Signed-in user's email, shown for confirmation. */
  email: string | null;
}

/** UI state machine for the approval action. */
type Status =
  | { kind: "idle" }
  | { kind: "submitting"; decision: "approve" | "deny" }
  | { kind: "approved" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

/** Maps an API error code to a human-readable message. */
function messageForError(code: string): string {
  switch (code) {
    case "unknown_user_code":
      return "That code is unknown or has expired. Start the login again from your terminal.";
    case "not_authenticated":
      return "Your session expired. Refresh the page and sign in again.";
    case "invalid_request":
      return "Enter the code shown in your terminal (for example WXYZ-1234).";
    default:
      return "Something went wrong approving the device. Please try again.";
  }
}

export function ActivateClient({
  initialUserCode,
  email,
}: ActivateClientProps): React.JSX.Element {
  const [userCode, setUserCode] = useState(initialUserCode);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submitting = status.kind === "submitting";

  const submit = async (decision: "approve" | "deny"): Promise<void> => {
    const code = userCode.trim();
    if (code.length === 0) {
      setStatus({ kind: "error", message: messageForError("invalid_request") });
      return;
    }
    setStatus({ kind: "submitting", decision });
    try {
      const res = await fetch("/api/auth/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: code, decision }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code =
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "unknown";
        setStatus({ kind: "error", message: messageForError(code) });
        return;
      }
      const approved = (data as { approved?: unknown }).approved === true;
      setStatus({ kind: approved ? "approved" : "denied" });
    } catch {
      setStatus({ kind: "error", message: messageForError("unknown") });
    }
  };

  // Terminal success / denial states replace the form.
  if (status.kind === "approved") {
    return (
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-400/10 text-2xl text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,0.7)]">
          ✓
        </div>
        <h2 className="text-lg font-black text-white">Device approved</h2>
        <p className="text-sm text-slate-300">
          You&apos;re all set. Return to your terminal — it will finish signing
          in automatically.
        </p>
      </div>
    );
  }

  if (status.kind === "denied") {
    return (
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-400/60 bg-fuchsia-400/10 text-2xl text-fuchsia-300">
          ✕
        </div>
        <h2 className="text-lg font-black text-white">Device denied</h2>
        <p className="text-sm text-slate-300">
          The login request was declined. You can safely close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {email ? (
        <p className="text-center text-xs font-medium text-slate-400">
          Signed in as{" "}
          <span className="font-mono text-cyan-300">{email}</span>
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="user_code"
          className="block font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/80"
        >
          Device code
        </label>
        <input
          id="user_code"
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.toUpperCase())}
          placeholder="WXYZ-1234"
          autoComplete="off"
          spellCheck={false}
          disabled={submitting}
          className="w-full rounded-lg border border-cyan-400/30 bg-black/40 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.3em] text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/80 focus:shadow-[0_0_24px_rgba(34,211,238,0.35)]"
        />
        <p className="text-center text-xs text-slate-500">
          Confirm this matches the code shown in your terminal.
        </p>
      </div>

      {status.kind === "error" ? (
        <p role="alert" className="text-center text-sm font-semibold text-fuchsia-300">
          {status.message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void submit("deny")}
          disabled={submitting}
          className="flex-1 rounded-lg border border-slate-600/60 bg-white/[0.02] px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-fuchsia-400/50 hover:text-fuchsia-200 disabled:opacity-50"
        >
          {status.kind === "submitting" && status.decision === "deny"
            ? "Denying..."
            : "Deny"}
        </button>
        <button
          type="button"
          onClick={() => void submit("approve")}
          disabled={submitting}
          className="flex-1 rounded-lg border border-cyan-400/70 bg-cyan-400/15 px-4 py-3 text-sm font-bold uppercase tracking-wider text-cyan-100 transition-all hover:bg-cyan-400/25 hover:shadow-[0_0_24px_rgba(34,211,238,0.5)] disabled:opacity-50"
        >
          {status.kind === "submitting" && status.decision === "approve"
            ? "Approving..."
            : "Approve device"}
        </button>
      </div>
    </div>
  );
}
