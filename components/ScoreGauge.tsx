function scoreColor(v: number): string {
  if (v >= 75) return "text-ok";
  if (v >= 50) return "text-warn";
  return "text-bad";
}

function scoreLabel(v: number): string {
  if (v >= 85) return "Hervorragend";
  if (v >= 70) return "Gut";
  if (v >= 50) return "Solide";
  if (v >= 30) return "Ausbaufähig";
  return "Schwach";
}

// 0-100-Anzeige mit Farbband — für Lage-Score und Autofrei-Score.
export default function ScoreGauge({ value, title }: { value: number; title: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="mb-1 text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold ${scoreColor(v)}`}>{v}</span>
        <span className="text-slate-400">/ 100</span>
        <span className={`ml-auto text-sm font-semibold ${scoreColor(v)}`}>{scoreLabel(v)}</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${v >= 75 ? "bg-ok" : v >= 50 ? "bg-warn" : "bg-bad"}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
