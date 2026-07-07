# Isochrone-Tools (Frontend)

Ein Next.js-16-Repo mit **vier touristischen Erreichbarkeits-Tools**, ausgeliefert über vier
Subdomains aus **einer** App (Host-Rewrite in `proxy.ts`):

| Subdomain | Route | Tool |
|-----------|-------|------|
| `lage-check.friedemann-schuetz.de` | `/lage-check` | Lage-Check (Gastgeber-Selbstcheck + PDF) |
| `ausflugs-radar.friedemann-schuetz.de` | `/ausflugs-radar` | Ausflugs-Radar (Gäste-Widget) |
| `lage-finder.friedemann-schuetz.de` | `/lage-finder` | Perfekte-Lage-Finder (goldene Zone) |
| `autofrei-check.friedemann-schuetz.de` | `/autofrei-check` | Autofrei-Check (ÖPNV) |

Lokal (`localhost:3000`) sind alle Tools direkt über ihren Pfad erreichbar; die Startseite `/`
verlinkt alle vier.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind 4 · MapLibre GL 5 ·
turf.js (nur Lage-Finder: Union/Schnitt der Isochronen).

## Backend

n8n (launchkit), async Token-Polling. Die App proxyt serverseitig (Secrets bleiben im Server):
`app/api/<tool>/start` → `/webhook/iso-<tool>`, `app/api/status` → `/webhook/iso-status`.
Details: [`../../workflows/isochrone-tools/README.md`](../../workflows/isochrone-tools/README.md).

## Env-Variablen

Siehe `.env.local.example`:

- `N8N_BASE` = `https://n8n.friedemann-schuetz.de`
- `N8N_ISO_SECRET` = Webhook-Secret (muss zu den n8n-Workflows passen)
- `NOMINATIM_EMAIL` = Kontakt für den Nominatim-User-Agent

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # vor jedem Deploy grün prüfen
```

## Deploy

Vercel (GitHub-Integration), **`git push origin main`** — nicht `vercel deploy --prod`.
Git-Autor-Mail muss die GitHub-Mail sein (`friedemann.schuetz@posteo.de`).
Im Vercel-Projekt vier Domains hinzufügen, DNS je Subdomain CNAME → `cname.vercel-dns.com`.
