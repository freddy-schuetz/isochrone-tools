"use client";

import { useMemo, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import IsoMapDynamic from "@/components/IsoMapDynamic";
import ModeTimePicker from "@/components/ModeTimePicker";
import PoiCard from "@/components/PoiCard";
import MethodBox, { type MethodContent } from "@/components/MethodBox";
import AboutSection from "@/components/AboutSection";
import { usePolling } from "@/lib/usePolling";
import type { Feature, FeatureCollection, GeocodeHit, RadarMode, RadarResult, RichPoi } from "@/lib/types";

const CAT_META: Record<string, { label: string; color: string; emoji: string }> = {
  kultur: { label: "Kultur", color: "#9333ea", emoji: "🏛️" },
  natur: { label: "Natur", color: "#16a34a", emoji: "🌲" },
  familie: { label: "Familie", color: "#f59e0b", emoji: "🎡" },
  sonstiges: { label: "Sonstiges", color: "#0ea5e9", emoji: "📍" },
};
const MODE_LABEL: Record<RadarMode, string> = {
  "foot-walking": "zu Fuß",
  "cycling-regular": "mit dem Rad",
  "driving-car": "mit dem Auto",
};

const METHOD: MethodContent = {
  intro:
    "Der Radar zeigt, welche Ausflugsziele du von deinem Standort in deinem Zeitbudget wirklich erreichst — mit echter Fahrzeit statt Luftlinie. Die bekanntesten Ziele reichern wir mit Wikipedia-Wissen und Foto an.",
  sources: [
    "FOSSGIS-Valhalla — Erreichbarkeits-Fläche (Isochrone) + echte Fahrzeit/-distanz je Ziel (Matrix)",
    "OpenStreetMap (Overpass API) — touristische Ziele innerhalb der Erreichbarkeits-Fläche",
    "Wikipedia — Kurzbeschreibung + freies Foto + Quell-Link, sofern verknüpft",
  ],
  steps: [
    "Wir berechnen die Fläche, die du im gewählten Modus/Zeitbudget erreichst.",
    "Darin suchen wir touristische Ziele aus OpenStreetMap und priorisieren bekannte (Wikipedia-belegte).",
    "Für jedes Ziel berechnen wir die echte Fahrzeit; die Top-Ziele bekommen Foto + Kurztext.",
    "Über die Deep-Links kommst du direkt zur Navigation (Google Maps / Komoot).",
  ],
  limits: [
    "Fahrzeiten sind Router-Schätzungen (ohne Live-Verkehr).",
    "Nur in OpenStreetMap erfasste Ziele erscheinen; Fotos gibt es nur, wo eine offene Quelle verknüpft ist.",
  ],
};

export default function AusflugsRadar() {
  const [hit, setHit] = useState<GeocodeHit | null>(null);
  const [mode, setMode] = useState<RadarMode>("driving-car");
  const [minutes, setMinutes] = useState(30);
  const [token, setToken] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { status, result, errorMessage } = usePolling<RadarResult>(token);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hit) {
      setStartError("Bitte zuerst einen Ort aus den Vorschlägen auswählen.");
      return;
    }
    setStartError(null);
    setToken(null);
    setActiveCats([]);
    try {
      const res = await fetch("/api/ausflugs-radar/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: hit.lat, lng: hit.lng, mode, minutes, address: hit.label }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setStartError("Der Radar konnte nicht gestartet werden. Bitte Eingaben prüfen.");
        return;
      }
      setToken(data.token);
    } catch {
      setStartError("Der Radar konnte nicht gestartet werden. Bitte später erneut versuchen.");
    }
  }

  const cats = useMemo(() => {
    const set = new Set(result?.pois.map((p) => p.cat) ?? []);
    return Array.from(set);
  }, [result]);

  const shownPois = useMemo(() => {
    if (!result) return [];
    if (activeCats.length === 0) return result.pois;
    return result.pois.filter((p) => activeCats.includes(p.cat));
  }, [result, activeCats]);

  const origin = result?.center ?? null;
  const poisFc = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: shownPois.map((p) => ({
        type: "Feature",
        properties: {
          id: p.id,
          cat: p.cat,
          name: p.name,
          emoji: CAT_META[p.cat]?.emoji ?? "📍",
          category_label: CAT_META[p.cat]?.label ?? p.cat,
          desc: p.description ?? "",
          img: p.image ?? "",
          website: p.website ?? "",
          meta_right: p.travel_minutes != null ? `${p.travel_minutes} Min` : p.distance_km != null ? `${p.distance_km} km` : "",
          gmaps: `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin.lat},${origin.lng}` : ""}&destination=${p.lat},${p.lng}`,
          komoot: `https://www.komoot.de/plan/@${p.lat},${p.lng},14z`,
        },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    }),
    [shownPois, origin]
  );

  const poiColors = Object.fromEntries(Object.entries(CAT_META).map(([k, v]) => [k, v.color]));

  const richPois = useMemo<RichPoi[]>(
    () =>
      shownPois.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        emoji: CAT_META[p.cat]?.emoji ?? "📍",
        color: CAT_META[p.cat]?.color ?? "#0ea5e9",
        category_label: CAT_META[p.cat]?.label ?? p.cat,
        meta_right: p.travel_minutes != null ? `${p.travel_minutes} Min` : p.distance_km != null ? `${p.distance_km} km` : "",
        description: p.description,
        image: p.image,
        wiki_url: p.wiki_url,
        website: p.website,
        wheelchair: p.wheelchair,
        fee: p.fee,
      })),
    [shownPois]
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Ausflugs-Radar
        </p>
        <h1 className="mb-3 text-3xl font-bold text-brand sm:text-4xl">
          Was erreiche ich von hier — und in welcher Zeit?
        </h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Wähle deinen Standort, die Fortbewegungsart und dein Zeitbudget. Wir zeigen dir alle
          lohnenden Ausflugsziele im Radius — mit echter Fahrzeit. Datenbasis: OpenStreetMap.
        </p>
      </header>

      <form onSubmit={submit} className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <label className="mb-1 block text-sm font-medium">Dein Standort / Urlaubsort</label>
          <AddressSearch placeholder="z. B. Monschau" onSelect={setHit} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ModeTimePicker
            mode={mode}
            onMode={setMode}
            minutes={minutes}
            onMinutes={setMinutes}
            timeOptions={[15, 30, 60]}
          />
          <button
            type="submit"
            disabled={status === "running"}
            className="rounded-lg bg-brand px-5 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            {status === "running" ? "Suche …" : "Ziele finden"}
          </button>
        </div>
        {startError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{startError}</p>}
      </form>

      {status === "running" && (
        <div className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="animate-pulse font-medium text-brand">
            Erreichbarkeits-Fläche und Ausflugsziele werden berechnet … (10–60 Sekunden)
          </p>
        </div>
      )}
      {(status === "error" || status === "timeout" || status === "not_found") && (
        <div className="mb-8 rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
          <p className="text-bad">
            Die Suche ist fehlgeschlagen{errorMessage ? ` (${errorMessage})` : ""}. Bitte versuche es
            erneut.
          </p>
        </div>
      )}

      {status === "done" && result && (
        <section className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">
              <strong>{result.pois.length}</strong> Ausflugsziele {MODE_LABEL[result.mode]} in{" "}
              <strong>{result.minutes} Minuten</strong> erreichbar.
            </p>
            {cats.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {cats.map((c) => {
                  const active = activeCats.length === 0 || activeCats.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setActiveCats((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                        active ? "text-white" : "bg-white text-slate-500 ring-slate-300"
                      }`}
                      style={active ? { backgroundColor: CAT_META[c]?.color, borderColor: CAT_META[c]?.color } : {}}
                    >
                      {CAT_META[c]?.emoji} {CAT_META[c]?.label ?? c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <IsoMapDynamic
            center={[result.center.lng, result.center.lat]}
            zones={[
              {
                id: "iso",
                data: result.isochrone as Feature,
                color: "#0ea5e9",
                fillOpacity: 0.1,
              },
            ]}
            pois={poisFc}
            poiColors={poiColors}
            markers={[{ lat: result.center.lat, lng: result.center.lng }]}
            heightClass="h-[460px]"
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
          <p className="-mt-3 text-center text-xs text-slate-400">💡 Tipp: Punkt auf der Karte anklicken für Foto, Infos &amp; Links.</p>

          {richPois.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {richPois.map((p) => (
                <PoiCard key={p.id} poi={p} origin={result.center} highlighted={selectedId === p.id} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Keine Ziele in dieser Kategorie.</p>
          )}

          <MethodBox content={METHOD} />
          <AboutSection mailSubject="Ausflugs-Radar für unsere Region" />
        </section>
      )}
    </main>
  );
}
