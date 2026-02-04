import Link from 'next/link';
import MailingListForm from '@/components/MailingListForm';

export default function HomePage() {
  return (
    <div>
      <section className="section">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <p className="inline-flex items-center rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ember">
              New: Frozen BBQ Drops
            </p>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Legendary BBQ, two ways: catered feasts or frozen bags ready for your freezer.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Reserve limited-run 0.5 lb bags, pick up locally, and pay at pickup. Or browse our catering packs when
              you need to feed the whole crew.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/frozen-drops"
                className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-black shadow-glow transition hover:translate-y-[-1px]"
              >
                Order Frozen BBQ
              </Link>
              <Link
                href="/catering"
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-ember/50 hover:text-ember"
              >
                View Catering
              </Link>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm text-slate-300">
              Payment is collected at pickup. Inventory is limited and tracked per drop.
            </div>
          </div>
          <div className="flex-1">
            <div className="card relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ember/10 via-transparent to-transparent" />
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Brisket', desc: 'Smoked low & slow. 0.5 lb bags.' },
                  { title: 'Pulled Pork', desc: 'Peach wood smoke. Ready to reheat.' },
                  { title: 'Catering Packs', desc: 'Full spreads for teams & events.' },
                  { title: 'Local Pickup', desc: 'Cache Valley + Utah County.' }
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/5 bg-smoke/60 p-4">
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <p className="text-xs text-slate-400">{card.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
                Pro tip: frozen drops sell out fast. Join the list below so you never miss a pickup window.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-charcoal/60">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card space-y-4">
              <h2 className="text-2xl font-semibold text-white">Frozen Drops</h2>
              <p className="text-slate-300">
                Limited batches, pre-packaged 0.5 lb bags. Reserve quantities, choose a pickup spot, and pay when you
                grab your order.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Real-time remaining bags per product</li>
                <li>• Pickup slots across Cache Valley & Utah County</li>
                <li>• Confirmation email with pickup window</li>
              </ul>
              <Link href="/frozen-drops" className="text-ember hover:underline">
                See active drop
              </Link>
            </div>
            <div className="card space-y-4">
              <h2 className="text-2xl font-semibold text-white">Catering</h2>
              <p className="text-slate-300">
                From brisket by the pound to full sides and family-style packages, we keep pricing transparent and the
                process simple.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Menus + pricing at a glance</li>
                <li>• Contact CTA to lock in your date</li>
                <li>• No online payment — we keep it human</li>
              </ul>
              <Link href="/catering" className="text-ember hover:underline">
                View catering menu
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Join the Drop List</h3>
          </div>
          <MailingListForm />
        </div>
      </section>
    </div>
  );
}
