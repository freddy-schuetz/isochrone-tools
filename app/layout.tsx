import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erreichbarkeits-Tools für den Tourismus",
  description:
    "Vier kostenlose Karten-Tools auf OpenStreetMap-Basis: Lage-Check für Gastgeber, Ausflugs-Radar, Perfekte-Lage-Finder und Autofrei-Check.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <div className="flex-1">{children}</div>
        <footer className="px-3 py-4 text-center text-xs text-slate-500">
          powered by{" "}
          <a href="https://friedemann-schuetz.de" target="_blank" rel="noopener noreferrer" className="text-brand-accent underline-offset-2 hover:underline">
            friedemann-schuetz.de
          </a>
          <span className="hidden sm:inline"> · </span>
          <a href="mailto:f.schuetz@posteo.de" className="underline-offset-2 hover:underline">f.schuetz@posteo.de</a>
          <span className="hidden sm:inline"> · </span>
          <a href="https://friedemann-schuetz.de/impressum.html" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            Impressum
          </a>
          <span className="mt-0.5 block sm:mt-0 sm:inline sm:before:content-['_·_']">
            Kartendaten © OpenStreetMap-Mitwirkende · Routing: openrouteservice / Transitous
          </span>
        </footer>
      </body>
    </html>
  );
}
