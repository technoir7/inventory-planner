import { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="text-sm text-ink/70">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
