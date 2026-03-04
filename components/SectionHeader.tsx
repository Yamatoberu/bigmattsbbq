export function SectionHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#f0c16a]">
          {eyebrow}
        </p>
      )}
      <div className="section-title-wrap mt-3">
        <span className="section-title-line hidden md:block" />
        <h2 className="text-2xl font-semibold text-smoke-900 md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <span className="section-title-line hidden md:block" />
      </div>
      {subtitle && <p className="mt-3 text-sm text-smoke-600 md:text-base">{subtitle}</p>}
    </div>
  );
}
