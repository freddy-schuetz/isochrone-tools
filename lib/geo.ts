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
