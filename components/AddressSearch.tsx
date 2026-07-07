"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeHit } from "@/lib/types";

interface Props {
  placeholder?: string;
  onSelect: (hit: GeocodeHit) => void;
}

// Debounced-Adresssuche gegen /api/geocode (Nominatim-Proxy, 400 ms Debounce).
export default function AddressSearch({ placeholder = "Adresse oder Ort eingeben …", onSelect }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value.trim())}`);
        const data = (await res.json()) as { hits: GeocodeHit[] };
        setHits(data.hits ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-slate-400">sucht …</span>
      )}
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {hits.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setQ(h.label);
                  setOpen(false);
                  onSelect(h);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && hits.length === 0 && q.trim().length >= 3 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          Keine Treffer — bitte Eingabe präzisieren.
        </p>
      )}
    </div>
  );
}
