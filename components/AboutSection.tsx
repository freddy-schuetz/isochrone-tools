// "Wer steckt dahinter" — gemeinsam mit dmo-tools.
export default function AboutSection({ mailSubject }: { mailSubject?: string }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="md:flex">
        <div className="flex flex-col justify-center bg-gradient-to-br from-brand to-brand-accent p-8 text-white md:w-1/3">
          <div className="mb-2 text-xs uppercase tracking-wider opacity-80">Hinter dem Tool</div>
          <div className="mb-1 text-xl font-semibold">Friedemann Schütz</div>
          <div className="mb-4 text-sm opacity-90">
            (AI) Automation Expert
            <br />
            n8n Ambassador
          </div>
          <div className="border-t border-white/20 pt-3 text-xs opacity-75">Essen, Deutschland</div>
        </div>
        <div className="p-8 md:w-2/3">
          <h3 className="mb-3 font-semibold text-slate-900">Wer steckt dahinter?</h3>
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            Ich unterstütze Destinationen und Tourismus-Betriebe dabei, aus offenen Daten (OpenStreetMap,
            Wikipedia &amp; Co.) <strong>echten Gäste-Mehrwert</strong> zu bauen — mit{" "}
            <strong>n8n-Workflows</strong>, KI-Agenten und, wo sinnvoll, auf{" "}
            <strong>eigener Infrastruktur</strong>: ohne Cloud-Zwang, datenschutzfreundlich, praxisnah.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-slate-700">
            Dieses Tool ist Teil einer <strong>Toolbox für Destinationen</strong>: von Erreichbarkeit &amp;
            Lage-Analysen über Gäste-Services bis zu Daten-Audits, die zeigen, wo eine Region in Karten &amp;
            KI-Assistenten sichtbar ist. Als Demo gebaut — als System für Ihre DMO umsetzbar.
          </p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {["OpenStreetMap", "n8n", "KI-Agenten", "Tourismus", "Self-Hosted", "DSGVO-konform"].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-brand"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`mailto:f.schuetz@posteo.de?subject=${encodeURIComponent(mailSubject ?? "Isochrone-Tools")}`}
              className="inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent"
            >
              Gespräch anfragen
            </a>
            <a
              href="https://friedemann-schuetz.de"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent hover:underline"
            >
              Mehr auf friedemann-schuetz.de →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
