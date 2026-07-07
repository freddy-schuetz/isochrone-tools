import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

// Nominatim-Proxy: User-Agent + Kontakt serverseitig (Nutzungspolicy: 1 req/s,
// Client debounced mit 400 ms). Ergebnis: kompakte Trefferliste fürs Suchfeld.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ hits: [] });
  }
  const email = process.env.NOMINATIM_EMAIL ?? "";
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0" +
    `&countrycodes=de,at,ch&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `isochrone-tools/0.1 (${email})` },
      signal: AbortSignal.timeout(10_000),
      // Nominatim-Antworten kurz cachen — identische Tipp-Anfragen nicht doppelt stellen
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ hits: [] });
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const hits = data.map((d) => ({
      label: d.display_name,
      lat: Number(parseFloat(d.lat).toFixed(5)),
      lng: Number(parseFloat(d.lon).toFixed(5)),
    }));
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: [] });
  }
}
