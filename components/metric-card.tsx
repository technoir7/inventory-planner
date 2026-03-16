export function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-soft">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-pine">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink/70">{detail}</p>
    </div>
  );
}
