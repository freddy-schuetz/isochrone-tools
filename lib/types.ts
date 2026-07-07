// Gemeinsame API-Kontrakte Frontend ↔ n8n (siehe Plan / n8n-Workflows "Iso – *")

import type {
  Feature as GJFeature,
  FeatureCollection as GJFeatureCollection,
  Geometry,
} from "geojson";

export type LngLat = { lat: number; lng: number };

// Standard-GeoJSON-Typen (kompatibel mit MapLibre/turf), Properties parametrisierbar
export type Feature<P extends Record<string, unknown> = Record<string, unknown>> = GJFeature<Geometry, P>;
export type FeatureCollection<P extends Record<string, unknown> = Record<string, unknown>> = GJFeatureCollection<Geometry, P>;

export type CheckStatus = "running" | "done" | "error" | "not_found";

export type StatusResponse<R> = {
  status: CheckStatus;
  tool?: string;
  result?: R;
  error_message?: string;
};

// --- UC1 Lage-Check ---------------------------------------------------------

export type IsoProps = { minutes: number };
export type PoiProps = { cat: string; name: string; band: number };

export type CategoryScore = {
  key: string;
  label: string;
  points: number;
  max: number;
  counts: { [band: string]: number }; // "5" | "10" | "15" → Anzahl POIs
  reason: string;
};

export type LageCheckResult = {
  address_resolved: string;
  center: LngLat;
  isochrones: FeatureCollection<IsoProps>;
  pois: FeatureCollection<PoiProps>;
  score: { total: number; categories: CategoryScore[] };
  highlights: string[];
};

// --- UC2 Ausflugs-Radar -----------------------------------------------------

export type RadarMode = "foot-walking" | "cycling-regular" | "driving-car";

export type RadarPoi = {
  id: string;
  name: string;
  cat: string;
  lat: number;
  lng: number;
  travel_minutes: number | null;
  distance_km: number | null;
  website: string | null;
};

export type RadarResult = {
  center: LngLat;
  mode: RadarMode;
  minutes: number;
  isochrone: Feature<{ mode: string; minutes: number }>;
  pois: RadarPoi[];
};

// --- UC3 Lage-Finder --------------------------------------------------------

export type FinderCategory = {
  key: string;
  label: string;
  pois: { name: string; lat: number; lng: number }[];
  isochrones: FeatureCollection<{ category: string }>;
};

export type FinderResult = {
  center: LngLat;
  ort_resolved: string;
  walkMinutes: number;
  categories: FinderCategory[];
  warnings: string[];
};

// --- UC4 Autofrei-Check -----------------------------------------------------

export type AutofreiConnection = {
  city: string;
  city_label: string;
  duration_minutes: number | null;
  transfers: number | null;
  legs: string[];
};

export type AutofreiResult = {
  center: LngLat;
  address_resolved: string;
  station: { name: string; lat: number; lng: number; walk_minutes: number | null; distance_km: number } | null;
  local_stop: { name: string; lat: number; lng: number; walk_minutes: number | null; departures_per_hour: number | null } | null;
  connections: AutofreiConnection[];
  score: { total: number; parts: { anreise: number; letzte_meile: number; taktung: number } };
  recommendations: string[];
};

// --- Geocoding (/api/geocode) ------------------------------------------------

export type GeocodeHit = {
  label: string;
  lat: number;
  lng: number;
};
