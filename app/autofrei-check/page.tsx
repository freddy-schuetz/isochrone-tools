"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import IsoMapDynamic from "@/components/IsoMapDynamic";
import AuditScore from "@/components/AuditScore";
import Card from "@/components/Card";
import MethodBox, { type MethodContent } from "@/components/MethodBox";
import AboutSection from "@/components/AboutSection";
import { usePolling } from "@/lib/usePolling";
import type { AutofreiResult, FeatureCollection, GeocodeHit } from "@/lib/types";

const METHOD: MethodContent = {
  intro:
    "Der Autofrei-Check bewertet, wie gut dein Betrieb ohne eigenes Auto erreichbar ist — von der Fernanreise per Bahn/Bus bis zur letzten Meile vor Ort.",
  sources: [
    "Transitous (MOTIS) — reale ÖPNV-Verbindungen aus den gewählten Städten (Samstag, Ankunft ~10 Uhr)",
    "OpenStreetMap — nächster Bahnhof, nächste Haltestelle, Fußweg-Distanzen",
    "FOSSGIS-Valhalla — Fußweg-Zeiten zur letzten Meile",
  ],
  steps: [
    "Wir suchen den nächsten Bahnhof und die nächste ÖPNV-Haltestelle zum Betrieb.",
    "Für 1–3 Quellstädte prüfen wir echte Bahn-/Bus-Verbindungen (Dauer, Umstiege).",
    "Wir bewerten Anreise, letzte Meile und Taktung am Halt.",
    "Daraus entsteht ein Autofrei-Score mit konkreten Empfehlungen.",
  ],
  scoring: [
    "Anreise (Bahn/Bus) 50 · Letzte Meile 30 · Taktung am Halt 20 Punkte (max. 100).",
    "Score ≥ 70 = sehr gut autofrei erreichbar · 40–69 = mit Einschränkungen · < 40 = schwierig.",
  ],
  limits: [
    "ÖPNV-Verbindungen sind ein Stichtag-Beispiel (Samstag ~10 Uhr) — reale Fahrpläne variieren.",
    "Nur in OSM/Transitous erfasste Halte und Linien fließen ein.",
  ],
};

const CITIES = [
  { key: "berlin", label: "Berlin" },
  { key: "hamburg", label: "Hamburg" },
  { key: "muenchen", label: "München" },
  { key: "koeln", label: "Köln" },
  { key: "frankfurt", label: "Frankfurt" },
  { key: "stuttgart", label: "Stuttgart" },
  { key: "leipzig", label: "Leipzig" },
  { key: "dresden", label: "Dresden" },
];

function fmtDuration(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default function AutofreiCheck() {
  const [hit, setHit] = useState<GeocodeHit | null>(null);
  const [cities, setCities] = useState<string[]>(["berlin", "hamburg"]);
  const [token, setToken] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const { status, result, errorMessage } = usePolling<AutofreiResult>(token);

  function toggleCity(key: string) {
    setCities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 3 ? [...prev, key] : prev
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hit) {
      setStartError("Bitte zuerst die Adresse des Betriebs auswählen.");
      return;
    }
    if (cities.length < 1) {
      setStartError("Bitte mindestens eine Herkunftsstadt wählen.");
      return;
    }
    setStartError(null);
    setToken(null);
    try {
      const res = await fetch("/api/autofrei-check/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: hit.lat, lng: hit.lng, address: hit.label, cities }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setStartError("Der Check konnte nicht gestartet werden. Bitte Eingaben prüfen.");
        return;
      }
      setToken(data.token);
    } catch {
      setStartError("Der Check konnte nicht gestartet werden. Bitte später erneut versuchen.");
    }
  }

  // Karten-Marker: Betrieb, Bahnhof, lokale Haltestelle
  const markers = result
    ? [
        { lat: result.center.lat, lng: result.center.lng, color: "#1e3a5f" },
        ...(result.station ? [{ lat: result.station.lat, lng: result.station.lng, color: "#dc2626" }] : []),
        ...(result.local_stop ? [{ lat: result.local_stop.lat, lng: result.local_stop.lng, color: "#0ea5e9" }] : []),
      ]
    : [];

  const emptyFc: FeatureCollection = { type: "FeatureCollection", features: [] };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Autofrei-Check
        </p>
        <h1 className="mb-3 text-3xl font-bold text-brand sm:text-4xl">
          Wie gut ist dein Betrieb ohne Auto erreichbar?
        </h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Immer mehr Gäste reisen ohne Auto an. Wir prüfen Bahn- und Busverbindungen aus großen
          Städten, den nächsten Bahnhof und die letzte Meile — und geben dir einen Autofrei-Score mit
          Tipps. Datenbasis: OpenStreetMap &amp; Transitous (ÖPNV).
        </p>
      </header>

      <form onSubmit={submit} className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <label className="mb-1 block text-sm font-medium">Adresse deines Betriebs</label>
          <AddressSearch placeholder="z. B. Ferienhof am Deich, Sankt Peter-Ording" onSelect={setHit} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Woher reisen deine Gäste an? (1–3 Städte)</p>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => {
              const on = cities.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCity(c.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                    on ? "bg-brand text-white ring-brand" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        {startError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{startError}</p>}
        <button
          type="submit"
          disabled={status === "running"}
          className="rounded-lg bg-brand px-5 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
        >
          {status === "running" ? "Prüfe Verbindungen …" : "Autofrei-Check starten"}
        </button>
      </form>

      {status === "running" && (
        <div className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="animate-pulse font-medium text-brand">
            Bahnhof, Haltestellen und ÖPNV-Verbindungen werden ermittelt … (10–60 Sekunden)
          </p>
        </div>
      )}
      {(status === "error" || status === "timeout" || status === "not_found") && (
        <div className="mb-8 rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
          <p className="text-bad">{errorMessage ?? "Der Check ist fehlgeschlagen. Bitte erneut versuchen."}</p>
        </div>
      )}

      {status === "done" && result && (
        <section className="space-y-5">
          <AuditScore
            score={result.score.total}
            title={`Autofrei-Score · ${result.address_resolved}`}
            subtitle="Erreichbarkeit ohne eigenes Auto"
            labels={{ good: "Sehr gut autofrei erreichbar", mid: "Mit Einschränkungen", bad: "Schwierig ohne Auto" }}
          />
          <Card>
            <p className="mb-2 text-sm font-medium text-slate-500">Zusammensetzung</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between"><span>Anreise (Bahn/Bus)</span><span className="font-semibold">{result.score.parts.anreise} / 50</span></li>
              <li className="flex justify-between"><span>Letzte Meile</span><span className="font-semibold">{result.score.parts.letzte_meile} / 30</span></li>
              <li className="flex justify-between"><span>Taktung am Halt</span><span className="font-semibold">{result.score.parts.taktung} / 20</span></li>
            </ul>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="mb-1 text-sm font-medium text-slate-500">Nächster Bahnhof</p>
              {result.station ? (
                <p className="text-sm">
                  <strong>{result.station.name}</strong> · {result.station.distance_km} km ·{" "}
                  {result.station.walk_minutes != null ? `${result.station.walk_minutes} Min Fußweg` : "Fußweg n/a"}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Kein Bahnhof im 15-km-Umkreis gefunden.</p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="mb-1 text-sm font-medium text-slate-500">Nächste Haltestelle</p>
              {result.local_stop ? (
                <p className="text-sm">
                  <strong>{result.local_stop.name}</strong> ·{" "}
                  {result.local_stop.walk_minutes != null ? `${result.local_stop.walk_minutes} Min Fußweg` : "Fußweg n/a"} ·{" "}
                  {result.local_stop.departures_per_hour != null
                    ? `${result.local_stop.departures_per_hour} Abfahrten/Std.`
                    : "Takt nicht ermittelt"}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Keine Haltestelle in der Nähe gefunden.</p>
              )}
            </div>
          </div>

          <IsoMapDynamic
            center={[result.center.lng, result.center.lat]}
            zones={[]}
            pois={emptyFc}
            markers={markers}
            fitToZones={false}
            heightClass="h-[360px]"
          />
          <p className="-mt-4 text-center text-xs text-slate-500">
            Dunkelblau: Betrieb · Rot: nächster Bahnhof · Hellblau: nächste Haltestelle
          </p>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-bold text-brand">Anreise mit Bahn &amp; Bus (Samstag, Ankunft ~10 Uhr)</h2>
            <ul className="space-y-3">
              {result.connections.map((c) => (
                <li key={c.city} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Ab {c.city_label}</span>
                    <span className="text-sm">
                      {fmtDuration(c.duration_minutes)}
                      {c.transfers != null && (
                        <span className="text-slate-500"> · {c.transfers === 0 ? "direkt" : `${c.transfers}× umsteigen`}</span>
                      )}
                    </span>
                  </div>
                  {c.legs.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{c.legs.join(" → ")}</p>
                  )}
                  {c.duration_minutes == null && (
                    <p className="mt-1 text-xs text-bad">Keine Verbindung gefunden.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {result.recommendations.length > 0 && (
            <div className="rounded-2xl bg-brand/5 p-6 ring-1 ring-brand/20">
              <h2 className="mb-2 text-lg font-bold text-brand">Empfehlungen</h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <MethodBox content={METHOD} />
          <AboutSection mailSubject="Autofrei-Check für meinen Betrieb" />
        </section>
      )}
    </main>
  );
}
