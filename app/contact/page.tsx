import Link from 'next/link';
import MailingListForm from '@/components/MailingListForm';

export default function ContactPage() {
  return (
    <section className="section">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-ember">Contact</p>
          <h1 className="text-3xl font-semibold text-white">Let&apos;s plan your BBQ.</h1>
          <p className="text-slate-300">
            Tell us about your event, headcount, and date. We&apos;ll confirm availability and lock in your menu.
          </p>
        </div>

        <div className="card space-y-4">
          <p className="text-sm text-slate-300">
            Prefer email? Drop us a line at{' '}
            <Link href="mailto:hello@bigmattsbbq.com" className="text-ember underline">
              hello@bigmattsbbq.com
            </Link>
            .
          </p>
          <form className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm text-slate-300" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                placeholder="Full name"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm text-slate-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm text-slate-300" htmlFor="date">
                Event date
              </label>
              <input
                id="date"
                type="date"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm text-slate-300" htmlFor="size">
                Headcount
              </label>
              <input
                id="size"
                placeholder="e.g. 75"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                placeholder="Tell us about the menu, timeline, and anything else."
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                className="w-full rounded-full bg-ember px-6 py-3 text-sm font-semibold text-black shadow-glow transition hover:translate-y-[-1px]"
              >
                Send request (opens email)
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Stay in the loop</h3>
          <MailingListForm />
        </div>
      </div>
    </section>
  );
}
