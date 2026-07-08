"use client";

import { useState } from "react";

export type MethodContent = {
  intro: string;
  sources: string[]; // Datenquellen
  steps: string[]; // wie
  scoring?: string[]; // was zählt wie
  limits?: string[]; // ehrliche Grenzen
};

// Aufklappbare "Welche Daten, wie & warum"-Box unter jedem Ergebnis.
export default function MethodBox({ title = "Wie funktioniert dieser Check?", content }: { title?: string; content: MethodContent }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-semibold text-brand">
          <span aria-hidden>ℹ️</span> {title}
        </span>
        <span aria-hidden className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-6 py-5 text-sm text-slate-700">
          <p>{content.intro}</p>
          <div>
            <p className="mb-1 font-semibold text-slate-900">Datenquellen</p>
            <ul className="list-inside list-disc space-y-1">
              {content.sources.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-semibold text-slate-900">So gehen wir vor</p>
            <ol className="list-inside list-decimal space-y-1">
              {content.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
          {content.scoring && content.scoring.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-slate-900">Wie wir bewerten</p>
              <ul className="list-inside list-disc space-y-1">
                {content.scoring.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {content.limits && content.limits.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-slate-900">Grenzen — ehrlich gesagt</p>
              <ul className="list-inside list-disc space-y-1 text-slate-500">
                {content.limits.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Kartendaten © OpenStreetMap-Mitwirkende · Beschreibungen/Bilder: Wikipedia/Wikimedia Commons ·
            Routing/Erreichbarkeit: FOSSGIS-Valhalla · ÖPNV: Transitous
          </p>
        </div>
      )}
    </section>
  );
}
