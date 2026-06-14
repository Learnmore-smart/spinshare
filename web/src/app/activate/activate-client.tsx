"use client";

/**
 * Interactive approve/deny control for the `/activate` page.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useT } from "@/lib/i18n/locale-provider";

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

export function ActivateClient({
  initialUserCode,
  email,
}: ActivateClientProps): React.JSX.Element {
  const t = useT();
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get("user_code") ?? "").trim();
  const resolvedCode = (initialUserCode.trim() || codeFromUrl).toUpperCase();
  const [userCode, setUserCode] = useState(resolvedCode);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const autoApproveStarted = useRef(false);

  useEffect(() => {
    if (resolvedCode) {
      setUserCode(resolvedCode);
    }
  }, [resolvedCode]);

  const submitting = status.kind === "submitting";

  const messageForError = (code: string): string => {
    switch (code) {
      case "unknown_user_code":
        return t.activate.errorUnknownCode;
      case "not_authenticated":
        return t.activate.errorNotAuthenticated;
      case "invalid_request":
        return t.activate.errorInvalidRequest;
      default:
        return t.activate.errorGeneric;
    }
  };

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
        const errCode =
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "unknown";
        setStatus({ kind: "error", message: messageForError(errCode) });
        return;
      }
      const approved = (data as { approved?: unknown }).approved === true;
      setStatus({ kind: approved ? "approved" : "denied" });
    } catch {
      setStatus({ kind: "error", message: messageForError("unknown") });
    }
  };

  // Already signed in on the website → approve the CLI/extension automatically.
  useEffect(() => {
    if (autoApproveStarted.current) return;
    if (!resolvedCode) return;
    autoApproveStarted.current = true;
    void submit("approve");
  }, [resolvedCode]);

  if (!resolvedCode) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-slate-600">
          {t.activate.missingCodeBody}
        </p>
        <div className="space-y-2 text-left">
          <label
            htmlFor="user_code"
            className="block text-xs font-black uppercase tracking-wider text-emerald-900/80"
          >
            {t.activate.pasteCodeLabel}
          </label>
          <input
            id="user_code"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value.toUpperCase())}
            placeholder={t.activate.pasteCodePlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="spinshare-input w-full px-4 py-3 text-center font-mono text-xl font-black tracking-[0.25em]"
          />
        </div>
        {status.kind === "error" ? (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {status.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void submit("approve")}
          disabled={submitting || userCode.trim().length === 0}
          className="spinshare-btn-primary min-h-12 w-full px-4 text-sm disabled:opacity-50"
        >
          {t.activate.approveDevice}
        </button>
      </div>
    );
  }

  if (status.kind === "submitting") {
    return (
      <div className="space-y-2 text-center" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-slate-600">
          {status.decision === "approve"
            ? t.activate.approvingDevice
            : t.activate.decliningRequest}
        </p>
        <p className="text-xs text-slate-500">{t.activate.returnToTerminal}</p>
      </div>
    );
  }

  if (status.kind === "approved") {
    return (
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-2xl text-emerald-700">
          ✓
        </div>
        <h2 className="text-lg font-black text-slate-950">{t.activate.approvedTitle}</h2>
        <p className="text-sm font-semibold text-slate-600">{t.activate.approvedBody}</p>
      </div>
    );
  }

  if (status.kind === "denied") {
    return (
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-2xl text-slate-500">
          ✕
        </div>
        <h2 className="text-lg font-black text-slate-950">{t.activate.deniedTitle}</h2>
        <p className="text-sm font-semibold text-slate-600">{t.activate.deniedBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {email ? (
        <p className="text-center text-xs font-black uppercase tracking-wider text-emerald-900/70">
          {t.activate.signedInAs}{" "}
          <span className="font-mono normal-case tracking-normal text-emerald-800">
            {email}
          </span>
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="user_code"
          className="block text-xs font-black uppercase tracking-wider text-emerald-900/80"
        >
          {t.activate.deviceCode}
        </label>
        <input
          id="user_code"
          value={userCode}
          readOnly
          aria-readonly
          autoComplete="off"
          spellCheck={false}
          disabled={submitting}
          className="spinshare-input w-full px-4 py-3 text-center font-mono text-xl font-black tracking-[0.25em]"
        />
        <p className="text-center text-xs font-semibold text-slate-500">
          {t.activate.codeHint}
        </p>
      </div>

      {status.kind === "error" ? (
        <p role="alert" className="text-center text-sm font-semibold text-red-600">
          {status.message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void submit("deny")}
          disabled={submitting}
          className="spinshare-btn-outline flex-1 min-h-12 px-4 text-sm disabled:opacity-50"
        >
          {t.activate.deny}
        </button>
        <button
          type="button"
          onClick={() => void submit("approve")}
          disabled={submitting}
          className="spinshare-btn-primary flex-1 min-h-12 px-4 text-sm disabled:opacity-50"
        >
          {t.activate.approveDevice}
        </button>
      </div>
    </div>
  );
}
