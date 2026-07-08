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

// Route-Linien (Thementour, Charge-&-Hike, Wegenetz): LineString/MultiLineString.
export type LineLayer = {
  id: string;
  data: FeatureCollection | Feature;
  color: string;
  width?: number;
  dashed?: boolean;
};

// Raster-Overlay (z. B. Regenradar RainViewer). tiles = XYZ-URL-Template(s).
export type RasterLayer = {
  id: string;
  tiles: string[];
  opacity?: number;
  tileSize?: number;
};

// Eingefärbte Heat-Fläche (z. B. Lade-Lücken): Polygone, Farbe interpoliert über eine Property.
export type HeatCells = {
  id: string;
  data: FeatureCollection | Feature;
  property: string;
  stops: [number, string][]; // [wert, farbe] aufsteigend
  opacity?: number;
};

export type MapMarker = { lat: number; lng: number; color?: string; label?: string };

export interface IsoMapProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  zones: ZoneLayer[];
  lines?: LineLayer[];
  rasterLayers?: RasterLayer[];
  heatCells?: HeatCells[];
  pois?: FeatureCollection | null;
  poiColors?: Record<string, string>; // cat → Farbe
  markers?: MapMarker[];
  fitToZones?: boolean;
  heightClass?: string;
  onSelect?: (id: string) => void; // Klick auf POI → id (für Highlight der Karte unten)
  selectedId?: string | null; // hebt den gewählten POI mit Ring hervor
}

function toFC(d: FeatureCollection | Feature): FeatureCollection {
  return d.type === "FeatureCollection" ? d : { type: "FeatureCollection", features: [d] };
}

// Emoji als transparentes Bild (nur Glyph, kein Hintergrund) — liegt über dem farbigen Kreis.
function emojiIcon(emoji: string, size = 40): ImageData | null {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${Math.floor(size * 0.68)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return ctx.getImageData(0, 0, size, size);
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

// Reiches Popup aus den standardisierten POI-Properties (Foto, Kurztext, offen-Chip, Deep-Links).
function popupHtml(p: Record<string, unknown>): string {
  const parts: string[] = ['<div style="font:13px system-ui;max-width:230px">'];
  if (p.img) parts.push(`<img src="${esc(p.img)}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>`);
  parts.push(`<strong>${esc((p.emoji ? p.emoji + " " : "") + (p.name ?? ""))}</strong>`);
  if (p.category_label) parts.push(`<div style="color:#64748b;font-size:12px">${esc(p.category_label)}</div>`);
  if (p.desc) parts.push(`<div style="font-size:12px;margin-top:4px;color:#334155">${esc(p.desc)}</div>`);
  const chips: string[] = [];
  if (p.open_now === true || p.open_now === "true") chips.push('<span style="color:#16a34a">● geöffnet</span>');
  if (p.open_now === false || p.open_now === "false") chips.push('<span style="color:#dc2626">● geschlossen</span>');
  if (p.meta_right) chips.push(`<span style="color:#64748b">${esc(p.meta_right)}</span>`);
  if (chips.length) parts.push(`<div style="font-size:12px;margin-top:4px;display:flex;gap:8px">${chips.join("")}</div>`);
  if (p.oh) parts.push(`<div style="font-size:12px;margin-top:4px;color:#64748b">🕑 ${esc(p.oh)}</div>`);
  const links: string[] = [];
  if (p.gmaps) links.push(`<a href="${esc(p.gmaps)}" target="_blank" rel="noopener" style="color:#0ea5e9;text-decoration:none">Google Maps ↗</a>`);
  if (p.komoot) links.push(`<a href="${esc(p.komoot)}" target="_blank" rel="noopener" style="color:#0ea5e9;text-decoration:none">Komoot ↗</a>`);
  if (p.website) links.push(`<a href="${esc(p.website)}" target="_blank" rel="noopener" style="color:#0ea5e9;text-decoration:none">Website ↗</a>`);
  if (links.length) parts.push(`<div style="font-size:12px;margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">${links.join("")}</div>`);
  parts.push("</div>");
  return parts.join("");
}

function collectBounds(layers: { data: FeatureCollection | Feature }[]): maplibregl.LngLatBounds | null {
  const b = new maplibregl.LngLatBounds();
  let any = false;
  const addPt = (pt: number[]) => {
    b.extend(pt as [number, number]);
    any = true;
  };
  for (const z of layers) {
    for (const f of toFC(z.data).features) {
      const g = f.geometry;
      if (g.type === "Polygon") (g.coordinates as number[][][]).forEach((r) => r.forEach(addPt));
      else if (g.type === "MultiPolygon") (g.coordinates as number[][][][]).forEach((p) => p[0]?.forEach(addPt));
      else if (g.type === "LineString") (g.coordinates as number[][]).forEach(addPt);
      else if (g.type === "MultiLineString") (g.coordinates as number[][][]).forEach((l) => l.forEach(addPt));
      else if (g.type === "Point") addPt(g.coordinates as number[]);
    }
  }
  return any ? b : null;
}

export default function IsoMap({
  center,
  zoom = 13,
  zones,
  lines = [],
  rasterLayers = [],
  heatCells = [],
  pois,
  poiColors = {},
  markers = [],
  fitToZones = true,
  heightClass = "h-[420px]",
  onSelect,
  selectedId = null,
}: IsoMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const zoneIdsRef = useRef<string[]>([]);
  const lineIdsRef = useRef<string[]>([]);
  const rasterIdsRef = useRef<string[]>([]);
  const heatIdsRef = useRef<string[]>([]);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const emojiSet = useRef<Set<string>>(new Set());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 15, 9],
          "circle-color": ["to-color", ["coalesce", ["get", "color"], "#0ea5e9"]],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": ["case", ["==", ["get", "open_now"], false], 0.45, 0.95],
        },
      });
      // Emoji-Glyph über dem farbigen Kreis (nur wo Feature ein emoji hat)
      map.addLayer({
        id: "pois-emoji",
        type: "symbol",
        source: "pois",
        layout: {
          "icon-image": ["coalesce", ["get", "emoji"], ""],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 15, 0.8],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      // Highlight-Ring für den gewählten POI
      map.addSource("selected", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "selected-ring",
        type: "circle",
        source: "selected",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 12, 15, 18],
          "circle-color": "#0ea5e9",
          "circle-opacity": 0.18,
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-width": 2.5,
        },
      });

      const onPoiClick = (ev: maplibregl.MapLayerMouseEvent) => {
        const f = ev.features?.[0];
        if (!f) return;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "250px", offset: 12 })
          .setLngLat(ev.lngLat)
          .setHTML(popupHtml(props))
          .addTo(map);
        if (props.id != null && onSelectRef.current) onSelectRef.current(String(props.id));
      };
      map.on("click", "pois-circles", onPoiClick);
      map.on("click", "pois-emoji", onPoiClick);
      for (const lyr of ["pois-circles", "pois-emoji"]) {
        map.on("mouseenter", lyr, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", lyr, () => (map.getCanvas().style.cursor = ""));
      }
      readyRef.current = true;
      applyRaster();
      applyHeatCells();
      applyZones();
      applyLines();
      applyPois();
      applySelected();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      zoneIdsRef.current = [];
      lineIdsRef.current = [];
      rasterIdsRef.current = [];
      heatIdsRef.current = [];
      emojiSet.current = new Set();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const rasterRef = useRef(rasterLayers);
  rasterRef.current = rasterLayers;
  const heatRef = useRef(heatCells);
  heatRef.current = heatCells;
  const poisRef = useRef(pois);
  poisRef.current = pois;
  const poiColorsRef = useRef(poiColors);
  poiColorsRef.current = poiColors;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  function applyRaster() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const id of rasterIdsRef.current) {
      if (map.getLayer(`raster-${id}`)) map.removeLayer(`raster-${id}`);
      if (map.getSource(`rastersrc-${id}`)) map.removeSource(`rastersrc-${id}`);
    }
    rasterIdsRef.current = [];
    for (const r of rasterRef.current) {
      map.addSource(`rastersrc-${r.id}`, { type: "raster", tiles: r.tiles, tileSize: r.tileSize ?? 256 });
      map.addLayer(
        { id: `raster-${r.id}`, type: "raster", source: `rastersrc-${r.id}`, paint: { "raster-opacity": r.opacity ?? 0.7 } },
        map.getLayer("pois-circles") ? "pois-circles" : undefined
      );
      rasterIdsRef.current.push(r.id);
    }
  }

  function applyHeatCells() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const id of heatIdsRef.current) {
      if (map.getLayer(`heat-${id}`)) map.removeLayer(`heat-${id}`);
      if (map.getSource(`heatsrc-${id}`)) map.removeSource(`heatsrc-${id}`);
    }
    heatIdsRef.current = [];
    for (const h of heatRef.current) {
      map.addSource(`heatsrc-${h.id}`, { type: "geojson", data: toFC(h.data) });
      const expr: unknown[] = ["interpolate", ["linear"], ["coalesce", ["get", h.property], 0]];
      for (const [val, col] of h.stops) expr.push(val, col);
      map.addLayer(
        { id: `heat-${h.id}`, type: "fill", source: `heatsrc-${h.id}`,
          paint: { "fill-color": expr as maplibregl.ExpressionSpecification, "fill-opacity": h.opacity ?? 0.5 } },
        map.getLayer("pois-circles") ? "pois-circles" : undefined
      );
      heatIdsRef.current.push(h.id);
    }
  }

  function applyZones() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const id of zoneIdsRef.current) {
      if (map.getLayer(`zone-fill-${id}`)) map.removeLayer(`zone-fill-${id}`);
      if (map.getLayer(`zone-line-${id}`)) map.removeLayer(`zone-line-${id}`);
      if (map.getSource(`zone-${id}`)) map.removeSource(`zone-${id}`);
    }
    zoneIdsRef.current = [];
    for (const z of zonesRef.current) {
      map.addSource(`zone-${z.id}`, { type: "geojson", data: toFC(z.data) });
      map.addLayer(
        { id: `zone-fill-${z.id}`, type: "fill", source: `zone-${z.id}`, paint: { "fill-color": z.color, "fill-opacity": z.fillOpacity ?? 0.15 } },
        "pois-circles"
      );
      map.addLayer(
        { id: `zone-line-${z.id}`, type: "line", source: `zone-${z.id}`, paint: { "line-color": z.color, "line-width": 1.5, "line-opacity": 0.7 } },
        "pois-circles"
      );
      zoneIdsRef.current.push(z.id);
    }
    if (fitToZones) {
      const b = collectBounds([...zonesRef.current, ...linesRef.current]);
      if (b) map.fitBounds(b, { padding: 40, animate: true, maxZoom: 15 });
    }
  }

  function applyLines() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const id of lineIdsRef.current) {
      if (map.getLayer(`line-${id}`)) map.removeLayer(`line-${id}`);
      if (map.getSource(`linesrc-${id}`)) map.removeSource(`linesrc-${id}`);
    }
    lineIdsRef.current = [];
    for (const l of linesRef.current) {
      map.addSource(`linesrc-${l.id}`, { type: "geojson", data: toFC(l.data) });
      map.addLayer(
        {
          id: `line-${l.id}`,
          type: "line",
          source: `linesrc-${l.id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": l.color,
            "line-width": l.width ?? 4,
            "line-opacity": 0.9,
            ...(l.dashed ? { "line-dasharray": [1.5, 1.2] } : {}),
          },
        },
        "pois-circles"
      );
      lineIdsRef.current.push(l.id);
    }
    if (fitToZones && zonesRef.current.length === 0 && linesRef.current.length > 0) {
      const b = collectBounds(linesRef.current);
      if (b) map.fitBounds(b, { padding: 40, animate: true, maxZoom: 15 });
    }
  }

  function applyPois() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("pois") as maplibregl.GeoJSONSource | undefined;
    const data = poisRef.current ?? EMPTY;
    const colored: FeatureCollection = {
      type: "FeatureCollection",
      features: data.features.map((f) => {
        const p = (f.properties ?? {}) as { cat?: string; color?: string; emoji?: string };
        // Emoji-Icon bei Bedarf registrieren (Key = Emoji-Zeichen)
        const emoji = typeof p.emoji === "string" && p.emoji ? p.emoji : "";
        if (emoji && !emojiSet.current.has(emoji)) {
          const img = emojiIcon(emoji);
          if (img && !map.hasImage(emoji)) {
            map.addImage(emoji, img, { pixelRatio: 2 });
            emojiSet.current.add(emoji);
          }
        }
        return {
          ...f,
          properties: {
            ...f.properties,
            color: poiColorsRef.current[p.cat ?? ""] ?? p.color ?? "#0ea5e9",
            emoji,
          },
        };
      }),
    };
    src?.setData(colored as GeoJSON.GeoJSON);
    applySelected();
  }

  function applySelected() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("selected") as maplibregl.GeoJSONSource | undefined;
    const id = selectedRef.current;
    const data = poisRef.current;
    let feat: Feature | null = null;
    if (id && data) {
      feat = (data.features.find((f) => String((f.properties as { id?: unknown })?.id) === id) as Feature) ?? null;
    }
    src?.setData((feat ? { type: "FeatureCollection", features: [feat] } : EMPTY) as GeoJSON.GeoJSON);
  }

  useEffect(applyRaster, [rasterLayers]);
  useEffect(applyHeatCells, [heatCells]);
  useEffect(applyZones, [zones, fitToZones]);
  useEffect(applyLines, [lines, fitToZones]);
  useEffect(applyPois, [pois, poiColors]);
  useEffect(applySelected, [selectedId]);

  // --- Marker ----------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of markerRefs.current) m.remove();
    markerRefs.current = markers.map((m) =>
      new maplibregl.Marker({ color: m.color ?? "#dc2626" }).setLngLat([m.lng, m.lat]).addTo(map)
    );
  }, [markers]);

  // --- Center nachführen (ohne Zonen/Linien) ---------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || zonesRef.current.length > 0 || linesRef.current.length > 0) return;
    map.flyTo({ center, zoom, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  return <div ref={elRef} className={`w-full rounded-2xl ${heightClass}`} />;
}
