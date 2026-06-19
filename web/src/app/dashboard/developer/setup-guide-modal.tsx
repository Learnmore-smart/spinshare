"use client";

/**
 * Setup guide modal — explains how to install the VS Code extension and connect
 * it so impressions start crediting to the signed-in developer account.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BookOpen, Check, Copy, X } from "lucide-react";

import { useT } from "@/lib/i18n/locale-provider";
import { SPINSHARE_INSTALL_COMMAND } from "@/lib/spinshare-install-command";

function CopyBlock({ code, label }: { code: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied — ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-slate-950 text-left">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">
          {label}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-white/10"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t.setupGuide.copied : t.setupGuide.copy}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-50 sm:text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5 text-left">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <div className="mt-1.5 space-y-2 text-left text-sm font-semibold leading-relaxed text-slate-600">
          {children}
        </div>
      </div>
    </li>
  );
}

export interface SetupGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ open, onClose }: SetupGuideModalProps) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const onDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="spinshare-modal-dialog fixed inset-0 z-[100] m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm open:flex open:items-end open:justify-center sm:open:items-center sm:open:p-4"
      onClose={onDialogClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div
        className="spinshare-modal-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-emerald-900/10 bg-[#f4fbf6] shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:max-h-[85dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-emerald-900/8 bg-white/80 px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 sm:right-4 sm:top-4"
            aria-label={t.setupGuide.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="px-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
              {t.setupGuide.eyebrow}
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-black text-slate-950">
              {t.setupGuide.title}
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {t.setupGuide.subtitle}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-left sm:px-5">
          <ol className="space-y-5">
            <Step n={1} title={t.setupGuide.extStep1Title}>
              <p>{t.setupGuide.extStep1Body}</p>
              <CopyBlock label={t.setupGuide.labelInstall} code={SPINSHARE_INSTALL_COMMAND} />
            </Step>
            <Step n={2} title={t.setupGuide.extStep2Title}>
              <p>{t.setupGuide.extStep2Body}</p>
            </Step>
            <Step n={3} title={t.setupGuide.extStep3Title}>
              <p>{t.setupGuide.extStep3Body}</p>
            </Step>
            <Step n={4} title={t.setupGuide.extStep4Title}>
              <p>{t.setupGuide.extStep4Body}</p>
            </Step>
          </ol>
        </div>

        <footer className="shrink-0 border-t border-emerald-900/8 bg-white/90 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="spinshare-btn-primary min-h-11 w-full justify-center text-sm"
          >
            {t.setupGuide.gotIt}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export interface SetupGuideButtonProps {
  className?: string;
  label?: string;
}

/** Opens the setup guide modal. */
export function SetupGuideButton({
  className = "",
  label,
}: SetupGuideButtonProps) {
  const t = useT();
  const buttonLabel = label ?? t.setupGuide.howToSetUp;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`spinshare-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm ${className}`}
      >
        <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
        {buttonLabel}
      </button>
      <SetupGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Compact variant for inline empty states. */
export function SetupGuideLinkButton({ className = "" }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`spinshare-btn-outline inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 text-xs ${className}`}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
        {t.setupGuide.howToSetUp}
      </button>
      <SetupGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
