// Einheitlicher Sektions-Wrapper (GEO-Audit-Optik).
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}
