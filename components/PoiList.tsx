export type PoiListItem = {
  id: string;
  name: string;
  sub?: string;
  right?: string;
};

// Kompakte POI-/Ergebnis-Liste (Text-Fallback zur Karte, a11y).
export default function PoiList({ items, emptyText = "Keine Einträge gefunden." }: { items: PoiListItem[]; emptyText?: string }) {
  if (items.length === 0) {
    return <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{it.name}</p>
            {it.sub && <p className="truncate text-xs text-slate-500">{it.sub}</p>}
          </div>
          {it.right && <span className="shrink-0 text-sm font-semibold text-brand">{it.right}</span>}
        </li>
      ))}
    </ul>
  );
}
