/**
 * Custom 404 page — smooth, on-brand not-found experience.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, Home } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { useT } from "@/lib/i18n/locale-provider";

function NotFoundTitle({ children }: { children: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  const handleMouseMove = (event: React.MouseEvent<HTMLHeadingElement>) => {
    const el = titleRef.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      ry: x * 20,
      rx: (0.5 - y) * 20,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, active: false });
  };

  return (
    <h1
      ref={titleRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-hovered={tilt.active ? "true" : "false"}
      className="spinshare-404-3d text-[8rem] font-black leading-none tracking-tighter select-none sm:text-[12rem] lg:text-[16rem]"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${tilt.active ? 1.02 : 1}, ${tilt.active ? 1.02 : 1}, 1)`,
        textShadow: tilt.active
          ? `${-tilt.ry * 0.7}px ${8 + tilt.rx * 0.5}px 0 #6ee7b7, ${-tilt.ry * 1.1}px ${12 + tilt.rx * 0.7}px 0 #34d399, ${-tilt.ry * 1.4}px ${18 + tilt.rx * 0.9}px 0 #10b981, ${-tilt.ry * 1.8}px ${26 + tilt.rx * 1.1}px 32px rgba(16, 185, 129, 0.42), ${-tilt.ry * 2.2}px ${36 + tilt.rx * 1.3}px 56px rgba(16, 185, 129, 0.28)`
          : undefined,
        transition: tilt.active
          ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.15s ease"
          : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.45s ease",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </h1>
  );
}

export default function NotFound() {
  const t = useT();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="liquid-glass spinshare-static mx-auto mt-3 flex h-16 max-w-7xl items-center justify-between rounded-[20px] bg-white/55 px-4 backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)] sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
            <Image
              src="/logo/spinshare-logo.png"
              alt="SpinShare Logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
            />
            <SpinShareWordmark className="text-xl" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/#demo" className="transition hover:text-emerald-700">
              Demo
            </Link>
            <Link href="/#experiment" className="transition hover:text-emerald-700">
              Experiment
            </Link>
            <Link href="/#postmortem" className="transition hover:text-emerald-700">
              Postmortem
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href="https://www.rateministere.com"
              target="_blank"
              rel="noopener noreferrer"
              className="spinshare-btn-outline inline-flex h-10 items-center gap-2 px-4 text-sm"
            >
              <Home className="h-4 w-4" />
              Home
            </a>
            <Link
              href="/"
              className="spinshare-btn-primary inline-flex h-10 items-center gap-2 px-5 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.common.backToHome}
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-screen bg-[#f3faf5]">
        <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center px-4 pt-12 pb-16 text-center">
          <NotFoundTitle>{t.notFound.title}</NotFoundTitle>

          <p className="mx-auto mt-6 max-w-md text-lg font-bold text-slate-700">
            {t.notFound.body}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">
            {t.notFound.sub}
          </p>

          <Link
            href="/"
            className="spinshare-btn-primary mt-8 inline-flex h-12 items-center gap-2 px-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.backToHome}
          </Link>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
