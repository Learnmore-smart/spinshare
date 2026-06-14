/** Shared layout helpers for legal pages (Privacy, Terms). */

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section {...(id !== undefined ? { id: `section-${id}`, className: "scroll-mt-28" } : {})}>
      <h2 className="text-2xl font-black tracking-tight text-slate-950">
        {id !== undefined ? `${id}. ` : ""}
        {title}
      </h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export function LegalSubsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export const codeClass =
  "rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[13px] text-emerald-800";
