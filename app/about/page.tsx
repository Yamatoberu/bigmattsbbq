export default function AboutPage() {
  return (
    <section className="section">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-ember">About</p>
          <h1 className="text-3xl font-semibold text-white">Slow-smoked in Utah.</h1>
          <p className="text-slate-300">
            Big Matt&apos;s BBQ started as a backyard obsession and grew into a catering staple across Cache Valley and Utah
            County. We smoke with post oak and peach, rest our briskets like religion, and keep service personal.
          </p>
        </div>
        <div className="card space-y-3">
          <h3 className="text-lg font-semibold text-white">What we believe</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Craft matters: no shortcuts, no gimmicks.</li>
            <li>• Local first: pickup-friendly drops, community events, and catering that feels human.</li>
            <li>• Transparency: clear pricing, no surprise fees, payment at pickup.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
