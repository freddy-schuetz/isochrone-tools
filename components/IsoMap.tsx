"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Feature, FeatureCollection } from "@/lib/types";

// Heller City-Basemap (CARTO Voyager, keyless) — Muster aus cool-city-guide.
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tileSize: 256,
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: "© OpenStreetMap-Mitwirkende © CARTO",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export type ZoneLayer = {
  id: string;
  data: FeatureCollection | Feature;
  color: string;
  fillOpacity?: number;
};

export type MapMarker = { lat: number; lng: number; color?: string };

export interface IsoMapProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  zones: ZoneLayer[];
  pois?: FeatureCollection | null;
  poiColors?: Record<string, string>; // cat → Farbe
  markers?: MapMarker[];
  fitToZones?: boolean;
  heightClass?: string;
}

function toFC(d: FeatureCollection | Feature): FeatureCollection {
  return d.type === "FeatureCollection" ? d : { type: "FeatureCollection", features: [d] };
}

function collectBounds(zones: ZoneLayer[]): maplibregl.LngLatBounds | null {
  const b = new maplibregl.LngLatBounds();
  let any = false;
  for (const z of zones) {
    for (const f of toFC(z.data).features) {
      const g = f.geometry;
      const polys: number[][][][] =
        g.type === "Polygon" ? [g.coordinates as number[][][]] :
        g.type === "MultiPolygon" ? (g.coordinates as number[][][][]) : [];
      for (const poly of polys) {
        for (const pt of poly[0] ?? []) {
          b.extend(pt as [number, number]);
          any = true;
        }
      }
    }
  }
  return any ? b : null;
}

export default function IsoMap({
  center,
  zoom = 13,
  zones,
  pois,
  poiColors = {},
  markers = [],
  fitToZones = true,
  heightClass = "h-[420px]",
}: IsoMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const zoneIdsRef = useRef<string[]>([]);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // --- Map einmalig initialisieren -----------------------------------------
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = new maplibregl.Map({
      container: elRef.current,
      style: STYLE,
      center,
      zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("pois", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "pois-circles",
        type: "circle",
        source: "pois",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 15, 7],
          "circle-color": ["coalesce", ["get", "color"], "#0ea5e9"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });
      map.on("click", "pois-circles", (ev) => {
        const f = ev.features?.[0];
        if (!f) return;
        const name = (f.properties?.name as string) ?? "";
        const sub = (f.properties?.sub as string) ?? "";
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(ev.lngLat)
          .setHTML(
            `<div style="font:13px system-ui"><strong>${name}</strong>${sub ? `<br/>${sub}` : ""}</div>`
          )
          .addTo(map);
      });
      map.on("mouseenter", "pois-circles", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "pois-circles", () => (map.getCanvas().style.cursor = ""));
      readyRef.current = true;
      // Initialdaten anwenden (Effekte unten laufen ggf. vor "load")
      applyZones();
      applyPois();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      zoneIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Zonen (Isochrone / goldene Zone) --------------------------------------
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const poisRef = useRef(pois);
  poisRef.current = pois;
  const poiColorsRef = useRef(poiColors);
  poiColorsRef.current = poiColors;

  function applyZones() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    // alte Zonen-Layer entfernen
    for (const id of zoneIdsRef.current) {
      if (map.getLayer(`zone-fill-${id}`)) map.removeLayer(`zone-fill-${id}`);
      if (map.getLayer(`zone-line-${id}`)) map.removeLayer(`zone-line-${id}`);
      if (map.getSource(`zone-${id}`)) map.removeSource(`zone-${id}`);
    }
    zoneIdsRef.current = [];
    for (const z of zonesRef.current) {
      map.addSource(`zone-${z.id}`, { type: "geojson", data: toFC(z.data) });
      map.addLayer(
        {
          id: `zone-fill-${z.id}`,
          type: "fill",
          source: `zone-${z.id}`,
          paint: { "fill-color": z.color, "fill-opacity": z.fillOpacity ?? 0.15 },
        },
        "pois-circles"
      );
      map.addLayer(
        {
          id: `zone-line-${z.id}`,
          type: "line",
          source: `zone-${z.id}`,
          paint: { "line-color": z.color, "line-width": 1.5, "line-opacity": 0.7 },
        },
        "pois-circles"
      );
      zoneIdsRef.current.push(z.id);
    }
    if (fitToZones) {
      const b = collectBounds(zonesRef.current);
      if (b) map.fitBounds(b, { padding: 40, animate: true, maxZoom: 15 });
    }
  }

  function applyPois() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("pois") as maplibregl.GeoJSONSource | undefined;
    const data = poisRef.current ?? EMPTY;
    // Farbe je Kategorie in die Properties schreiben (einfacher als Match-Expression)
    const colored: FeatureCollection = {
      type: "FeatureCollection",
      features: data.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          color: poiColorsRef.current[(f.properties as { cat?: string }).cat ?? ""] ?? "#0ea5e9",
        },
      })),
    };
    src?.setData(colored as GeoJSON.GeoJSON);
  }

  useEffect(applyZones, [zones, fitToZones]);
  useEffect(applyPois, [pois, poiColors]);

  // --- Marker ----------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of markerRefs.current) m.remove();
    markerRefs.current = markers.map((m) =>
      new maplibregl.Marker({ color: m.color ?? "#dc2626" }).setLngLat([m.lng, m.lat]).addTo(map)
    );
  }, [markers]);

  // --- Center nachführen (ohne Zonen) -----------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || zonesRef.current.length > 0) return;
    map.flyTo({ center, zoom, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  return <div ref={elRef} className={`w-full rounded-2xl ${heightClass}`} />;
}
