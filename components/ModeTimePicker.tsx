"use client";

import type { RadarMode } from "@/lib/types";

const MODES: { value: RadarMode; label: string }[] = [
  { value: "foot-walking", label: "🚶 Zu Fuß" },
  { value: "cycling-regular", label: "🚲 Rad" },
  { value: "driving-car", label: "🚗 Auto" },
];

interface Props {
  mode?: RadarMode;
  onMode?: (m: RadarMode) => void;
  minutes: number;
  onMinutes: (m: number) => void;
  timeOptions: number[];
  showModes?: boolean;
}

// Fuß/Rad/Auto + Zeitbudget als Button-Gruppen (UC2; UC3 nur Zeiten).
export default function ModeTimePicker({ mode, onMode, minutes, onMinutes, timeOptions, showModes = true }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showModes && onMode && (
        <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Fortbewegungsart">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMode(m.value)}
              className={`px-3 py-1.5 text-sm ${mode === m.value ? "bg-brand text-white" : "bg-white hover:bg-slate-50"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Zeitbudget">
        {timeOptions.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onMinutes(t)}
            className={`px-3 py-1.5 text-sm ${minutes === t ? "bg-brand text-white" : "bg-white hover:bg-slate-50"}`}
          >
            {t} Min
          </button>
        ))}
      </div>
    </div>
  );
}
