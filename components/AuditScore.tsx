// Conic-Gradient-Score-Ring + Verdict (GEO-Audit-Optik) für die Checks.
function verdict(score: number, labels?: { good: string; mid: string; bad: string }) {
  const l = labels ?? { good: "Sehr gut", mid: "Ausbaufähig", bad: "Schwach" };
  if (score >= 70) return { text: l.good, cls: "text-ok", ring: "#16a34a" };
  if (score >= 40) return { text: l.mid, cls: "text-warn", ring: "#d97706" };
  return { text: l.bad, cls: "text-bad", ring: "#dc2626" };
}

export default function AuditScore({
  score,
  title,
  subtitle,
  labels,
}: {
  score: number;
  title: string;
  subtitle?: string;
  labels?: { good: string; mid: string; bad: string };
}) {
  const v = verdict(score, labels);
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div
          className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${v.ring} ${s * 3.6}deg, #e2e8f0 0deg)` }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
            <span className={`text-4xl font-bold ${v.cls}`}>{s}</span>
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-bold ${v.cls}`}>{v.text}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
