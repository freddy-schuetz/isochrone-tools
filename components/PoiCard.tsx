"use client";

import { useEffect, useRef, useState } from "react";
import type { RichPoi } from "@/lib/types";

function gmapsDir(p: RichPoi, origin?: { lat: number; lng: number }) {
  const base = "https://www.google.com/maps/dir/?api=1";
  const dest = `&destination=${p.lat},${p.lng}`;
  const orig = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  return base + orig + dest;
}
function komoot(p: RichPoi) {
  return `https://www.komoot.de/plan/@${p.lat},${p.lng},14z`;
}

const WHEELCHAIR_LABEL: Record<string, string> = { yes: "barrierefrei", limited: "teils barrierefrei", no: "nicht barrierefrei" };

// Reiche Ergebnis-Karte: Foto (frei), Beschreibung (Wiki), KI-Einordnung, nützliche OSM-Chips,
// Route auf der Karte + Deep-Links. Fehlende Felder werden sauber weggelassen.
export default function PoiCard({
  poi,
  origin,
  onRoute,
  routeActive,
  highlighted,
}: {
  poi: RichPoi;
  origin?: { lat: number; lng: number };
  onRoute?: (poi: RichPoi) => void;
  routeActive?: boolean;
  highlighted?: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = poi.image && imgOk;
  const ref = useRef<HTMLElement>(null);

  // Bei Auswahl auf der Karte: sanft hierher scrollen.
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  return (
    <article
      ref={ref}
      className={`flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 transition ${
        highlighted ? "ring-2 ring-brand-accent" : "ring-slate-200"
      }`}
    >
      {showImg && (
        <a href={poi.wiki_url ?? poi.image!} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poi.image!}
            alt={poi.name}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200 sm:h-28 sm:w-28"
          />
        </a>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <h3 className="font-semibold text-brand">
            {poi.emoji ? `${poi.emoji} ` : ""}
            {poi.name}
          </h3>
          <span className="shrink-0 text-sm font-medium text-slate-500">
            {poi.meta_right ?? (poi.distance_km != null ? `${poi.distance_km} km` : "")}
          </span>
        </div>

        {(poi.category_label || poi.badges?.length || poi.notes?.length) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {poi.category_label && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {poi.category_label}
              </span>
            )}
            {poi.badges?.map((b) => (
              <span key={b} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-ok">
                {b}
              </span>
            ))}
            {poi.notes?.map((n) => (
              <span key={n} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                {n}
              </span>
            ))}
          </div>
        )}

        {poi.description && <p className="mt-2 text-sm text-slate-700">{poi.description}</p>}
        {poi.ai_why && (
          <p className="mt-1 text-sm italic text-slate-500">
            <span aria-hidden>💡</span> {poi.ai_why}
          </p>
        )}
        {poi.species && poi.species.length > 0 && (
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Dokumentierte Arten hier: </span>
            {poi.species.map((s) => s.name_de).join(", ")}
          </p>
        )}

        {/* Info-Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {poi.open_now === true && <span className="rounded-full bg-green-50 px-2 py-0.5 text-ok">● geöffnet</span>}
          {poi.open_now === false && <span className="rounded-full bg-red-50 px-2 py-0.5 text-bad">● geschlossen</span>}
          {poi.cuisine && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">🍽 {poi.cuisine}</span>}
          {poi.fee === "yes" && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">💶 Eintritt</span>}
          {poi.fee === "no" && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">💶 frei</span>}
          {poi.wheelchair && WHEELCHAIR_LABEL[poi.wheelchair] && (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">♿ {WHEELCHAIR_LABEL[poi.wheelchair]}</span>
          )}
        </div>
        {poi.opening_hours && <p className="mt-1 text-xs text-slate-500">🕑 {poi.opening_hours}</p>}

        {/* Aktionen */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {onRoute && (
            <button
              type="button"
              onClick={() => onRoute(poi)}
              className={`font-medium ${routeActive ? "text-brand-accent" : "text-brand hover:text-brand-accent"}`}
            >
              {routeActive ? "● Route aktiv" : "🗺 Route auf Karte"}
            </button>
          )}
          <a href={gmapsDir(poi, origin)} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-accent">
            Google Maps ↗
          </a>
          <a href={komoot(poi)} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-accent">
            Komoot ↗
          </a>
          {poi.website && (
            <a href={poi.website} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-accent">
              Website ↗
            </a>
          )}
          {poi.phone && <a href={`tel:${poi.phone}`} className="text-slate-500 hover:text-brand-accent">☎ {poi.phone}</a>}
          {poi.wiki_url && (
            <a href={poi.wiki_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-accent">
              Wikipedia ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
