import Link from "next/link";

const TOOLS = [
  {
    href: "/lage-check",
    emoji: "📍",
    title: "Lage-Check",
    text: "Wie gut ist die Lage deiner Unterkunft? Gehzeit-Analyse mit Lage-Score für Gastgeber.",
  },
  {
    href: "/ausflugs-radar",
    emoji: "🧭",
    title: "Ausflugs-Radar",
    text: "Was erreichst du in 15, 30 oder 60 Minuten? Ausflugsziele rund um deinen Urlaubsort.",
  },
  {
    href: "/lage-finder",
    emoji: "✨",
    title: "Perfekte-Lage-Finder",
    text: "Strand, Bahnhof, Restaurants? Finde die Zone im Ort, von der aus alles nah ist.",
  },
  {
    href: "/autofrei-check",
    emoji: "🚆",
    title: "Autofrei-Check",
    text: "Wie gut ist dein Betrieb ohne Auto erreichbar? Bahn, Bus und letzte Meile im Check.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Kostenlose Karten-Tools
        </p>
        <h1 className="mb-3 text-3xl font-bold text-brand sm:text-4xl">
          Erreichbarkeit sichtbar machen — für Gastgeber und Gäste
        </h1>
        <p className="text-slate-600">
          Vier Tools auf Basis von OpenStreetMap und echten Gehzeit-Zonen (Isochronen).
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-accent"
          >
            <div className="mb-2 text-3xl">{t.emoji}</div>
            <h2 className="mb-1 text-lg font-bold text-brand">{t.title}</h2>
            <p className="text-sm text-slate-600">{t.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
