"use client";

import { useMemo, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import IsoMapDynamic from "@/components/IsoMapDynamic";
import ModeTimePicker from "@/components/ModeTimePicker";
import MethodBox, { type MethodContent } from "@/components/MethodBox";
import AboutSection from "@/components/AboutSection";
import { usePolling } from "@/lib/usePolling";
import { intersectAll, simplifyFeature, unionAll } from "@/lib/geo";
import type { Feature, FinderResult, GeocodeHit } from "@/lib/types";
import type { ZoneLayer } from "@/components/IsoMap";

const METHOD: MethodContent = {
  intro:
    "Der Finder zeigt die „goldene Zone\" — den Bereich eines Orts, von dem aus ALLE deine gewählten Kriterien in der gewünschten Gehzeit erreichbar sind.",
  sources: [
    "FOSSGIS-Valhalla — Gehzeit-Zonen (Isochronen) je Kriterium auf dem OpenStreetMap-Wegenetz",
    "OpenStreetMap (Overpass API) — die Orte je Kriterium (Strand, Bahnhof, Gastro, Supermarkt, Spielplatz, Apotheke)",
  ],
  steps: [
    "Für jedes Kriterium suchen wir die passenden Orte und berechnen ihre Gehzeit-Zonen.",
    "Je Kriterium vereinigen wir alle Zonen zu einer Fläche.",
    "Der Schnitt aller Kriterien-Flächen ist die goldene Zone.",
    "Existiert sie, ist von dort aus wirklich alles zu Fuß erreichbar.",
  ],
  limits: [
    "Gibt es keine goldene Zone, liegen die Kriterien zu weit auseinander — weniger Kriterien oder mehr Gehzeit wählen.",
    "Nur in OpenStreetMap erfasste Orte fließen ein; die Zonen sind Router-Näherungen.",
  ],
};

const CRITERIA = [
  { key: "strand", label: "Strand", emoji: "🏖️" },
  { key: "bahnhof", label: "Bahnhof", emoji: "🚉" },
  { key: "gastro", label: "Restaurants", emoji: "🍽️" },
  { key: "supermarkt", label: "Supermarkt", emoji: "🛒" },
  { key: "spielplatz", label: "Spielplatz", emoji: "🧒" },
  { key: "apotheke", label: "Apotheke", emoji: "💊" },
];
const CAT_COLORS = ["#e11d48", "#2563eb", "#16a34a", "#9333ea", "#f59e0b", "#0891b2"];

export default function LageFinder() {
  const [hit, setHit] = useState<GeocodeHit | null>(null);
  const [selected, setSelected] = useState<string[]>(["strand", "gastro"]);
  const [minutes, setMinutes] = useState(10);
  const [token, setToken] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const { status, result, errorMessage } = usePolling<FinderResult>(token);

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 4 ? [...prev, key] : prev
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hit) {
      setStartError("Bitte zuerst einen Ort auswählen.");
      return;
    }
    if (selected.length < 2) {
      setStartError("Bitte mindestens zwei Kriterien wählen.");
      return;
    }
    setStartError(null);
    setToken(null);
    try {
      const res = await fetch("/api/lage-finder/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: hit.lat, lng: hit.lng, ort: hit.label, criteria: selected, walkMinutes: minutes }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setStartError("Die Suche konnte nicht gestartet werden. Bitte Eingaben prüfen.");
        return;
      }
      setToken(data.token);
    } catch {
      setStartError("Die Suche konnte nicht gestartet werden. Bitte später erneut versuchen.");
    }
  }

  // turf: Union je Kategorie, dann Schnitt über alle -> "goldene Zone"
  const { zones, goldenExists, categoryOrder } = useMemo(() => {
    if (!result) return { zones: [] as ZoneLayer[], goldenExists: false, categoryOrder: [] as string[] };
    const perCat = result.categories.map((c) => unionAll(c.isochrones));
    const golden = intersectAll(perCat);
    const z: ZoneLayer[] = [];
    result.categories.forEach((c, i) => {
      const u = perCat[i];
      if (u) z.push({ id: `cat-${c.key}`, data: u as Feature, color: CAT_COLORS[i % CAT_COLORS.length], fillOpacity: 0.08 });
    });
    if (golden) {
      z.push({ id: "golden", data: simplifyFeature(golden), color: "#eab308", fillOpacity: 0.55 });
    }
    return { zones: z, goldenExists: !!golden, categoryOrder: result.categories.map((c) => c.key) };
  }, [result]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Perfekte-Lage-Finder
        </p>
        <h1 className="mb-3 text-3xl font-bold text-brand sm:text-4xl">
          Wo im Ort ist wirklich alles zu Fuß erreichbar?
        </h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Wähle, was dir im Urlaub wichtig ist. Wir zeigen die <strong>goldene Zone</strong> — den
          Bereich, von dem aus alle deine Kriterien in {minutes} Gehminuten erreichbar sind.
        </p>
      </header>

      <form onSubmit={submit} className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <label className="mb-1 block text-sm font-medium">Urlaubsort</label>
          <AddressSearch placeholder="z. B. Warnemünde" onSelect={setHit} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Wichtig für mich (2–4 wählen):</p>
          <div className="flex flex-wrap gap-2">
            {CRITERIA.map((c) => {
              const on = selected.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                    on ? "bg-brand text-white ring-brand" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="mr-2 text-sm font-medium">max. Gehzeit:</span>
            <ModeTimePicker minutes={minutes} onMinutes={setMinutes} timeOptions={[5, 10, 15]} showModes={false} />
          </div>
          <button
            type="submit"
            disabled={status === "running"}
            className="rounded-lg bg-brand px-5 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            {status === "running" ? "Berechne …" : "Goldene Zone finden"}
          </button>
        </div>
        {startError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{startError}</p>}
      </form>

      {status === "running" && (
        <div className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="animate-pulse font-medium text-brand">
            Gehzeit-Zonen je Kriterium werden berechnet … Das kann bei vielen Kriterien bis zu 2
            Minuten dauern.
          </p>
        </div>
      )}
      {(status === "error" || status === "timeout" || status === "not_found") && (
        <div className="mb-8 rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
          <p className="text-bad">{errorMessage ?? "Die Suche ist fehlgeschlagen. Bitte erneut versuchen."}</p>
        </div>
      )}

      {status === "done" && result && (
        <section className="space-y-5">
          <div
            className={`rounded-2xl p-5 text-center ring-1 ${
              goldenExists ? "bg-amber-50 ring-amber-300" : "bg-slate-50 ring-slate-300"
            }`}
          >
            {goldenExists ? (
              <p className="font-semibold text-amber-700">
                ✨ Es gibt eine goldene Zone! Von dem gelben Bereich aus erreichst du alle{" "}
                {result.categories.length} Kriterien in höchstens {result.walkMinutes} Gehminuten.
              </p>
            ) : (
              <p className="text-slate-600">
                Keine gemeinsame Zone gefunden, in der <em>alle</em> Kriterien in {result.walkMinutes}{" "}
                Minuten erreichbar sind. Tipp: weniger Kriterien wählen oder die Gehzeit erhöhen.
              </p>
            )}
          </div>

          <IsoMapDynamic
            center={[result.center.lng, result.center.lat]}
            zones={zones}
            markers={[{ lat: result.center.lat, lng: result.center.lng, color: "#1e3a5f" }]}
            heightClass="h-[480px]"
          />

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="mb-3 text-sm font-medium text-slate-500">Legende</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {categoryOrder.map((key, i) => {
                const meta = CRITERIA.find((c) => c.key === key);
                return (
                  <span key={key} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                    />
                    {meta?.emoji} {meta?.label}
                  </span>
                );
              })}
              {goldenExists && (
                <span className="flex items-center gap-2 font-semibold text-amber-700">
                  <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-amber-400" />
                  ✨ Goldene Zone
                </span>
              )}
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              <ul className="list-inside list-disc space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-bold text-brand">Gefundene Orte je Kriterium</h2>
            <ul className="space-y-3">
              {result.categories.map((c, i) => {
                const meta = CRITERIA.find((cr) => cr.key === c.key);
                return (
                  <li key={c.key}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      {meta?.emoji} {c.label}
                      <span className="ml-1 font-normal text-slate-500">· {c.pois.length} in der Nähe</span>
                    </div>
                    {c.pois.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.pois.slice(0, 6).map((p) => p.name).filter(Boolean).join(" · ") || "(ohne Namen erfasst)"}
                        {c.pois.length > 6 ? " …" : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <MethodBox content={METHOD} />
          <AboutSection mailSubject="Perfekte-Lage-Finder für unsere Region" />
        </section>
      )}
    </main>
  );
}
