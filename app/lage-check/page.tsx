"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import IsoMapDynamic from "@/components/IsoMapDynamic";
import AuditScore from "@/components/AuditScore";
import Card from "@/components/Card";
import MethodBox, { type MethodContent } from "@/components/MethodBox";
import AboutSection from "@/components/AboutSection";
import { usePolling } from "@/lib/usePolling";
import type { Feature, GeocodeHit, IsoProps, LageCheckResult } from "@/lib/types";

const METHOD: MethodContent = {
  intro:
    "Der Lage-Check bewertet, wie viel deine Gäste zu Fuß erreichen — auf Basis echter Gehzeit-Zonen (Isochronen), nicht der Luftlinie.",
  sources: [
    "FOSSGIS-Valhalla — Gehzeit-Zonen (5/10/15 Min) auf dem OpenStreetMap-Wegenetz",
    "OpenStreetMap (Overpass API) — Gastronomie, ÖPNV, Nahversorgung, Sehenswürdigkeiten, Familienangebote in den Zonen",
    "Transitous (MOTIS) — echte nächste Abfahrten am nächstgelegenen ÖPNV-Halt",
  ],
  steps: [
    "Wir berechnen die 5-, 10- und 15-Gehminuten-Zonen rund um die Adresse.",
    "In den Zonen zählen wir die relevanten Orte je Kategorie aus OpenStreetMap.",
    "Nähe wird gewichtet: Funde in 5 Minuten zählen dreifach, in 10 Min doppelt, in 15 Min einfach.",
    "Zielgruppen-Profile gewichten dieselben Daten unterschiedlich (z. B. zählt Gastronomie für Genießer 40 statt 25 Punkte).",
    "Optional: zweite Adresse eingeben — das Lage-Duell vergleicht beide Standorte Kategorie für Kategorie.",
  ],
  scoring: [
    "Standard: Gastronomie 25 · ÖPNV 20 · Nahversorgung 20 · Sehenswürdigkeiten 20 · Familie 15 Punkte (max. 100).",
    "Score ≥ 70 = sehr gute Lage · 40–69 = solide · < 40 = eher abgelegen.",
  ],
  limits: [
    "Bewertet wird die fußläufige Erreichbarkeit laut OSM — Qualität/Öffnung der Orte fließt nicht ein.",
    "Der Ruhe-Hinweis ist eine reine Distanz-Heuristik zur nächsten Hauptverkehrsader — keine Lärmmessung, keine dB-Aussage.",
    "Abfahrten kommen aus offenen Fahrplandaten (Transitous, Fair-Use-Dienst) — ohne Gewähr, Störungen fehlen evtl.",
    "Sehr kleine oder neue Orte fehlen evtl. in OpenStreetMap.",
  ],
};

const POI_COLORS: Record<string, string> = {
  gastro: "#e11d48",
  oepnv: "#2563eb",
  nahversorgung: "#16a34a",
  sehenswuerdigkeit: "#9333ea",
  familie: "#f59e0b",
};

const ZONE_COLOR = "#0ea5e9";
const ZONE_OPACITY: Record<number, number> = { 15: 0.08, 10: 0.14, 5: 0.22 };

const NOISE_EMOJI: Record<string, string> = { sehr_ruhig: "🤫", ruhig: "🍃", maessig: "🔉", laut: "🔊" };

function profileTotal(r: LageCheckResult, profileKey: string): number {
  return r.profiles?.find((p) => p.key === profileKey)?.total ?? r.score.total;
}

export default function LageCheck() {
  const [hit, setHit] = useState<GeocodeHit | null>(null);
  const [hitB, setHitB] = useState<GeocodeHit | null>(null);
  const [bKey, setBKey] = useState(0); // remount der B-Suche beim Entfernen (Komponente hält eigenen Text)
  const [token, setToken] = useState<string | null>(null);
  const [tokenB, setTokenB] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [profile, setProfile] = useState("standard");
  const { status, result, errorMessage } = usePolling<LageCheckResult>(token);
  const { status: statusB, result: resultB } = usePolling<LageCheckResult>(tokenB);
  const [email, setEmail] = useState("");
  const [reportState, setReportState] = useState<"idle" | "loading" | "sent" | "link" | "error">("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function requestReport(withEmail: boolean) {
    if (!token) return;
    setReportState("loading");
    setPdfUrl(null);
    try {
      const res = await fetch("/api/lage-check/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: withEmail ? email : "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setReportState("error");
        return;
      }
      setPdfUrl(data.pdf_url ?? null);
      setReportState(data.sent ? "sent" : "link");
    } catch {
      setReportState("error");
    }
  }

  async function startOne(h: GeocodeHit): Promise<string | null> {
    const res = await fetch("/api/lage-check/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: h.label, lat: h.lat, lng: h.lng }),
    });
    const data = await res.json();
    return res.ok && data.token ? data.token : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hit) {
      setStartError("Bitte zuerst eine Adresse aus den Vorschlägen auswählen.");
      return;
    }
    setStartError(null);
    setToken(null);
    setTokenB(null);
    try {
      const tA = await startOne(hit);
      if (!tA) {
        setStartError("Der Check konnte nicht gestartet werden. Bitte Adresse prüfen.");
        return;
      }
      setToken(tA);
      if (hitB) {
        const tB = await startOne(hitB);
        if (tB) setTokenB(tB);
      }
    } catch {
      setStartError("Der Check konnte nicht gestartet werden. Bitte später erneut versuchen.");
    }
  }

  const zones =
    result?.isochrones.features.map((f) => ({
      id: `min-${(f.properties as IsoProps).minutes}`,
      data: f as Feature,
      color: ZONE_COLOR,
      fillOpacity: ZONE_OPACITY[(f.properties as IsoProps).minutes] ?? 0.1,
    })) ?? [];

  const duellActive = !!tokenB;
  const duellReady = duellActive && statusB === "done" && !!resultB && status === "done" && !!result;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Kostenloser Lage-Check für Gastgeber
        </p>
        <h1 className="mb-3 text-3xl font-bold text-brand sm:text-4xl">
          Wie gut ist die Lage deiner Unterkunft — zu Fuß?
        </h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Wir berechnen echte <strong>Gehzeit-Zonen</strong> (5, 10 und 15 Minuten) rund um deine
          Adresse und zählen, was Gäste dort erreichen: Gastronomie, Sehenswürdigkeiten, ÖPNV,
          Nahversorgung und Familienangebote. Datenbasis: OpenStreetMap.
        </p>
      </header>

      <form onSubmit={submit} className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <label className="mb-1 block text-sm font-medium">Adresse deiner Unterkunft</label>
          <AddressSearch placeholder="z. B. Strandstraße 12, Kühlungsborn" onSelect={setHit} />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="block text-sm font-medium text-slate-600">
              ⚔️ Optional: Vergleichsadresse fürs Lage-Duell
            </label>
            {hitB && (
              <button
                type="button"
                onClick={() => { setHitB(null); setBKey((k) => k + 1); }}
                className="text-xs text-slate-400 hover:text-bad"
              >
                ✕ Vergleich entfernen
              </button>
            )}
          </div>
          <AddressSearch key={bKey} placeholder="z. B. zweites Objekt in der Auswahl" onSelect={setHitB} />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={status === "running"}
            className="rounded-lg bg-brand px-5 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            {status === "running" ? "Analysiere …" : hitB ? "Lage-Duell starten" : "Lage prüfen"}
          </button>
        </div>
        {startError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{startError}</p>}
      </form>

      {status === "running" && (
        <div className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="animate-pulse font-medium text-brand">
            Gehzeit-Zonen werden berechnet und OpenStreetMap wird abgefragt … (10–60 Sekunden)
          </p>
        </div>
      )}
      {(status === "error" || status === "timeout" || status === "not_found") && (
        <div className="mb-8 rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
          <p className="text-bad">
            Die Analyse ist fehlgeschlagen{errorMessage ? ` (${errorMessage})` : ""}. Bitte versuche es
            in ein paar Minuten erneut.
          </p>
        </div>
      )}

      {status === "done" && result && (
        <section className="space-y-6">
          {/* Zielgruppen-Profile: gleiche Daten, andere Gewichtung */}
          {result.profiles && result.profiles.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-medium text-slate-500">Bewertet für:</span>
              {result.profiles.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setProfile(p.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                    profile === p.key ? "bg-brand text-white ring-brand" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          )}

          <AuditScore
            score={profileTotal(result, profile)}
            title={`Lage-Score · ${result.address_resolved}`}
            subtitle={
              profile === "standard"
                ? "Fußläufige Erreichbarkeit (5–15 Gehminuten)"
                : `Gewichtet für Profil „${result.profiles?.find((p) => p.key === profile)?.label}"`
            }
            labels={{ good: "Sehr gute Lage", mid: "Solide Lage", bad: "Eher abgelegen" }}
          />

          {/* Lage-Duell: beide Adressen im direkten Vergleich */}
          {duellActive && statusB === "running" && (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
              <p className="animate-pulse text-sm text-slate-500">⚔️ Vergleichsadresse wird noch berechnet …</p>
            </div>
          )}
          {duellReady && resultB && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand/30">
              <h2 className="mb-4 text-center text-lg font-bold text-brand">⚔️ Lage-Duell</h2>
              <div className="mb-5 grid grid-cols-2 gap-4 text-center">
                {[result, resultB].map((r, i) => {
                  const t = profileTotal(r, profile);
                  const other = profileTotal(i === 0 ? resultB : result, profile);
                  return (
                    <div key={i} className={`rounded-xl p-4 ring-1 ${t >= other ? "bg-amber-50 ring-amber-300" : "bg-slate-50 ring-slate-200"}`}>
                      <p className="mb-1 truncate text-xs font-medium text-slate-500" title={r.address_resolved}>
                        {i === 0 ? "A" : "B"} · {r.address_resolved}
                      </p>
                      <p className={`text-3xl font-bold ${t >= 70 ? "text-ok" : t >= 40 ? "text-warn" : "text-bad"}`}>
                        {t}
                        <span className="text-base font-normal text-slate-400"> / 100</span>
                      </p>
                      {t > other && <p className="mt-1 text-xs font-semibold text-amber-700">🏆 vorn</p>}
                      {t === other && <p className="mt-1 text-xs text-slate-500">unentschieden</p>}
                    </div>
                  );
                })}
              </div>
              <ul className="space-y-2">
                {result.score.categories.map((c) => {
                  const b = resultB.score.categories.find((x) => x.key === c.key);
                  if (!b) return null;
                  const winA = c.points > b.points, winB = b.points > c.points;
                  return (
                    <li key={c.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <span className={winA ? "font-bold text-brand" : "text-slate-500"}>
                          {c.points} {winA && "🏆"}
                        </span>
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                          <div className="ml-auto h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, backgroundColor: POI_COLORS[c.key] ?? "#0ea5e9" }} />
                        </div>
                      </div>
                      <span className="min-w-28 text-center text-xs font-medium text-slate-600">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                          <div className="h-full rounded-full" style={{ width: `${(b.points / b.max) * 100}%`, backgroundColor: POI_COLORS[c.key] ?? "#0ea5e9" }} />
                        </div>
                        <span className={winB ? "font-bold text-brand" : "text-slate-500"}>
                          {winB && "🏆"} {b.points}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-center text-xs text-slate-400">
                Karte und Details unten zeigen Adresse A · Punktzahlen im gewählten Profil-Gewicht sind oben, die Kategorie-Balken nutzen die Rohpunkte.
              </p>
            </div>
          )}

          <Card>
            <p className="mb-2 text-sm font-medium text-slate-500">Auf einen Blick</p>
            <ul className="space-y-1.5 text-sm">
              {result.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>✦</span>
                  <span>{h}</span>
                </li>
              ))}
              {result.noise && (
                <li className="flex gap-2">
                  <span aria-hidden>{NOISE_EMOJI[result.noise.level] ?? "🍃"}</span>
                  <span>
                    {result.noise.label}
                    <span className="text-xs text-slate-400"> (Distanz-Heuristik, keine Lärmmessung)</span>
                  </span>
                </li>
              )}
            </ul>
          </Card>

          {/* ÖPNV live: echte nächste Abfahrten am nächsten Halt */}
          {result.departures && (
            <Card>
              <p className="mb-2 text-sm font-medium text-slate-500">
                🚌 Nächster Halt: <strong className="text-slate-700">{result.departures.stop_name}</strong>{" "}
                <span className="text-slate-400">({result.departures.dist_m} m)</span> — nächste Abfahrten
              </p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {result.departures.list.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
                    <strong className="tabular-nums">{d.time}</strong>
                    <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">{d.line}</span>
                    <span className="max-w-40 truncate text-xs text-slate-500">→ {d.dest}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">Live-Fahrplandaten via Transitous (MOTIS) — ohne Gewähr.</p>
            </Card>
          )}

          <IsoMapDynamic
            center={[result.center.lng, result.center.lat]}
            zones={zones}
            pois={result.pois}
            poiColors={POI_COLORS}
            markers={[{ lat: result.center.lat, lng: result.center.lng }]}
            heightClass="h-[460px]"
          />
          <p className="-mt-4 text-center text-xs text-slate-500">
            Blaue Zonen: 5 / 10 / 15 Gehminuten · Punkte: gefundene Orte (anklickbar) · rote Nadel: deine Unterkunft
          </p>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-bold text-brand">Kategorien im Detail</h2>
            <ul className="space-y-4">
              {result.score.categories.map((c) => (
                <li key={c.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        aria-hidden
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: POI_COLORS[c.key] ?? "#0ea5e9" }}
                      />
                      {c.label}
                    </span>
                    <span className="text-sm text-slate-500">
                      {c.points} / {c.max} Punkte
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.points / c.max) * 100}%`,
                        backgroundColor: POI_COLORS[c.key] ?? "#0ea5e9",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{c.reason}</p>
                  {c.places && c.places.length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      z. B. {c.places.map((pl) => pl.name).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-lg font-bold text-brand">Report als PDF</h2>
            <p className="mb-4 text-sm text-slate-600">
              Hol dir die Auswertung als PDF — direkt herunterladen oder bequem per E-Mail.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de (optional)"
                aria-label="E-Mail-Adresse für den PDF-Report"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => requestReport(true)}
                disabled={reportState === "loading" || !email}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
              >
                Per E-Mail senden
              </button>
              <button
                type="button"
                onClick={() => requestReport(false)}
                disabled={reportState === "loading"}
                className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-slate-50 disabled:opacity-50"
              >
                Nur herunterladen
              </button>
            </div>
            {reportState === "loading" && (
              <p className="mt-3 animate-pulse text-sm text-slate-500">PDF wird erstellt … (bis zu 30 Sekunden)</p>
            )}
            {reportState === "sent" && (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-ok">
                Report verschickt — schau in dein Postfach.
              </p>
            )}
            {reportState === "link" && pdfUrl && (
              <p className="mt-3 text-sm">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-accent underline">
                  📄 PDF herunterladen
                </a>{" "}
                <span className="text-slate-500">(Link 1 Stunde gültig)</span>
              </p>
            )}
            {reportState === "error" && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
                PDF konnte nicht erstellt werden. Bitte später erneut versuchen.
              </p>
            )}
          </div>

          <MethodBox content={METHOD} />
          <AboutSection mailSubject="Lage-Check für meinen Betrieb" />
        </section>
      )}
    </main>
  );
}
