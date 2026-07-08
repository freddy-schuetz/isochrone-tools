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
  ],
  steps: [
    "Wir berechnen die 5-, 10- und 15-Gehminuten-Zonen rund um die Adresse.",
    "In den Zonen zählen wir die relevanten Orte je Kategorie aus OpenStreetMap.",
    "Nähe wird gewichtet: Funde in 5 Minuten zählen dreifach, in 10 Min doppelt, in 15 Min einfach.",
    "Jede Kategorie ist gedeckelt, damit Großstadtlagen kleine Orte nicht automatisch übertrumpfen.",
  ],
  scoring: [
    "Gastronomie 25 · ÖPNV 20 · Nahversorgung 20 · Sehenswürdigkeiten 20 · Familie 15 Punkte (max. 100).",
    "Score ≥ 70 = sehr gute Lage · 40–69 = solide · < 40 = eher abgelegen.",
  ],
  limits: [
    "Bewertet wird die fußläufige Erreichbarkeit laut OSM — Qualität/Öffnung der Orte fließt nicht ein.",
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

export default function LageCheck() {
  const [hit, setHit] = useState<GeocodeHit | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const { status, result, errorMessage } = usePolling<LageCheckResult>(token);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hit) {
      setStartError("Bitte zuerst eine Adresse aus den Vorschlägen auswählen.");
      return;
    }
    setStartError(null);
    setToken(null);
    try {
      const res = await fetch("/api/lage-check/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: hit.label, lat: hit.lat, lng: hit.lng }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setStartError("Der Check konnte nicht gestartet werden. Bitte Adresse prüfen.");
        return;
      }
      setToken(data.token);
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

      <form onSubmit={submit} className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="mb-1 block text-sm font-medium">Adresse deiner Unterkunft</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <AddressSearch placeholder="z. B. Strandstraße 12, Kühlungsborn" onSelect={setHit} />
          </div>
          <button
            type="submit"
            disabled={status === "running"}
            className="rounded-lg bg-brand px-5 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            {status === "running" ? "Analysiere …" : "Lage prüfen"}
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
          <AuditScore
            score={result.score.total}
            title={`Lage-Score · ${result.address_resolved}`}
            subtitle="Fußläufige Erreichbarkeit (5–15 Gehminuten)"
            labels={{ good: "Sehr gute Lage", mid: "Solide Lage", bad: "Eher abgelegen" }}
          />
          <Card>
            <p className="mb-2 text-sm font-medium text-slate-500">Auf einen Blick</p>
            <ul className="space-y-1.5 text-sm">
              {result.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>✦</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Card>

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
