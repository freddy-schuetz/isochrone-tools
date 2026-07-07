import { NextRequest, NextResponse } from "next/server";

// Host → Tool-Pfad. Jede Subdomain zeigt auf dieselbe Vercel-App;
// lokal (localhost) funktionieren die Pfade /lage-check etc. direkt.
// Next 16: "proxy" ist die Nachfolge-Konvention von "middleware".
const HOSTS: Record<string, string> = {
  "lage-check.friedemann-schuetz.de": "/lage-check",
  "ausflugs-radar.friedemann-schuetz.de": "/ausflugs-radar",
  "lage-finder.friedemann-schuetz.de": "/lage-finder",
  "autofrei-check.friedemann-schuetz.de": "/autofrei-check",
};

export default function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const prefix = HOSTS[host];
  if (!prefix) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith(prefix)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // /api, Next-Interna und statische Assets nie umschreiben
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
