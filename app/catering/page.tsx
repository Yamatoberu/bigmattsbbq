import Link from 'next/link';
import MailingListForm from '@/components/MailingListForm';

const meats = [
  { name: 'Sliced Brisket', price: '$28 / lb', notes: 'Prime packer, post-oak smoke' },
  { name: 'Pulled Pork', price: '$16 / lb', notes: 'Peach wood smoke, Carolina or Sweet glaze' },
  { name: 'Smoked Turkey', price: '$18 / lb', notes: 'Herb brine, pepper finish' }
];

const sides = [
  { name: 'Smoked Mac & Cheese', price: '$55 / half pan', notes: 'Feeds ~10' },
  { name: 'Pit Beans', price: '$40 / half pan', notes: 'Brisket trim, poblano' },
  { name: 'Slaw', price: '$30 / half pan', notes: 'Vinegar, crunch' }
];

const packages = [
  { name: 'Crew Pack', price: '$160', notes: 'Feeds ~10. Brisket + Pork + two sides + sauce.' },
  { name: 'Family Pack', price: '$95', notes: 'Feeds ~6. Choice of 2 meats + two sides.' },
  { name: 'Game Day Tray', price: '$225', notes: 'Feeds ~14. Brisket, pork, wings, beans, slaw, pickles.' }
];

export default function CateringPage() {
  return (
    <section className="section">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-ember">Catering</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Feed the whole crew.</h1>
          <p className="text-slate-300">
            Simple, transparent pricing. Choose meats by the pound, add sides, or pick a package. No online payment —
            we coordinate details and collect at delivery or pickup.
          </p>
          <Link
            href="/contact"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-ember px-5 py-3 text-sm font-semibold text-black shadow-glow transition hover:translate-y-[-1px]"
          >
            Contact for catering
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="text-xl font-semibold text-white">Meats</h2>
            <ul className="space-y-3">
              {meats.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.notes}</p>
                  </div>
                  <p className="text-sm text-slate-200">{item.price}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card space-y-3">
            <h2 className="text-xl font-semibold text-white">Sides</h2>
            <ul className="space-y-3">
              {sides.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.notes}</p>
                  </div>
                  <p className="text-sm text-slate-200">{item.price}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-xl font-semibold text-white">Packages</h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {packages.map((item) => (
              <li key={item.name} className="rounded-xl border border-white/5 bg-black/40 p-4">
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-sm text-slate-300">{item.price}</p>
                <p className="text-xs text-slate-400">{item.notes}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Join the mailing list</h3>
          <p className="text-sm text-slate-300">Get drop announcements and seasonal catering menus.</p>
          <MailingListForm />
        </div>
      </div>
    </section>
  );
}
