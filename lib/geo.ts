import union from "@turf/union";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import { featureCollection } from "@turf/helpers";
import type { Feature as GJFeature, MultiPolygon, Polygon } from "geojson";
import type { Feature, FeatureCollection } from "./types";

type PolyFeature = GJFeature<Polygon | MultiPolygon>;

function asPolyFeatures(fc: FeatureCollection): PolyFeature[] {
  return fc.features.filter(
    (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
  ) as PolyFeature[];
}

// Vereinigung aller Isochronen EINER Kategorie -> ein (Multi)Polygon.
export function unionAll(fc: FeatureCollection): PolyFeature | null {
  const polys = asPolyFeatures(fc);
  if (polys.length === 0) return null;
  let acc: PolyFeature = polys[0];
  for (let i = 1; i < polys.length; i++) {
    try {
      const u = union(featureCollection([acc, polys[i]]));
      if (u) acc = u as PolyFeature;
    } catch {
      // bei turf-Kantenfehlern die bisherige Vereinigung behalten
    }
  }
  return acc;
}

// Schnittmenge über mehrere Kategorie-Polygone -> die "goldene Zone" (oder null wenn leer).
export function intersectAll(polys: (PolyFeature | null)[]): PolyFeature | null {
  const valid = polys.filter((p): p is PolyFeature => p != null);
  if (valid.length === 0) return null;
  let acc: PolyFeature = valid[0];
  for (let i = 1; i < valid.length; i++) {
    try {
      const inter = intersect(featureCollection([acc, valid[i]]));
      if (!inter) return null; // leerer Schnitt -> keine gemeinsame Zone
      acc = inter as PolyFeature;
    } catch {
      return null;
    }
  }
  return acc;
}

export function simplifyFeature(f: PolyFeature, tolerance = 0.0005): Feature {
  try {
    return simplify(f, { tolerance, highQuality: false, mutate: false }) as Feature;
  } catch {
    return f as Feature;
  }
}

// Punkt-in-Polygon (even-odd Raycast über ALLE Ringe inkl. Löcher), Polygon + MultiPolygon.
export function pointInPoly(lng: number, lat: number, f: PolyFeature | null): boolean {
  if (!f?.geometry) return false;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const rings of polys) {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

// Fläche in km² (Shoelace mit äquirektangularer Projektion — für Zonen-Größen völlig ausreichend).
// Löcher (Ringe ab Index 1) werden abgezogen.
export function areaKm2(f: PolyFeature | null): number {
  if (!f?.geometry) return 0;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let total = 0;
  for (const rings of polys) {
    rings.forEach((ring, idx) => {
      if (ring.length < 4) return;
      const lat0 = (ring[0][1] * Math.PI) / 180;
      const kx = 111.32 * Math.cos(lat0), ky = 110.57;
      let s = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        s += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky);
      }
      const a = Math.abs(s) / 2;
      total += idx === 0 ? a : -a;
    });
  }
  return Math.max(total, 0);
}

// Schwerpunkt (Mittel der Außenring-Punkte) — reicht für Reverse-Geocoding der Zone.
export function roughCentroid(f: PolyFeature | null): { lat: number; lng: number } | null {
  if (!f?.geometry) return null;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let sx = 0, sy = 0, n = 0;
  for (const rings of polys) {
    for (const pt of rings[0] ?? []) { sx += pt[0]; sy += pt[1]; n++; }
  }
  return n ? { lat: sy / n, lng: sx / n } : null;
}
