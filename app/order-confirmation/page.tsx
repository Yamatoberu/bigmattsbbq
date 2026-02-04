import Link from 'next/link';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { poundsFromBags, formatWindow } from '@/lib/utils';

async function getOrder(orderNumber?: string | null) {
  if (!orderNumber) return null;
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        full_name,
        email,
        pickup:drop_pickups (
          start_time,
          end_time,
          instructions,
          pickup_location:pickup_locations(name, address)
        ),
        order_items:order_items (
          qty_bags,
          product:products(name, bag_size_lb)
        )
      `
      )
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Order fetch failed', err);
    return null;
  }
}

export default async function OrderConfirmation({
  searchParams
}: {
  searchParams: { order?: string };
}) {
  const orderNumber = searchParams.order;
  const order = await getOrder(orderNumber);

  if (!order) {
    return (
      <section className="section">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-3xl font-semibold text-white">Order confirmation</h1>
          <div className="card space-y-3">
            <p className="text-slate-300">We couldn&apos;t find that order.</p>
            <Link href="/frozen-drops" className="text-ember hover:underline">
              Back to frozen drops
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const items = order.order_items ?? [];
  const totals = items.reduce(
    (acc, item) => {
      acc.bags += item.qty_bags;
      acc.pounds += poundsFromBags(item.qty_bags, item.product?.bag_size_lb ?? 0.5);
      return acc;
    },
    { bags: 0, pounds: 0 }
  );

  return (
    <section className="section">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-emerald-300">Confirmed</p>
          <h1 className="text-3xl font-semibold text-white">Order #{order.order_number}</h1>
          <p className="text-slate-300">Thanks for reserving BBQ. Payment is collected at pickup.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-3">
            <h3 className="text-lg font-semibold text-white">Items</h3>
            <div className="space-y-2 text-sm text-slate-300">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {item.product?.name ?? 'Product'} · {item.qty_bags} bag{item.qty_bags === 1 ? '' : 's'}
                  </span>
                  <span className="text-slate-100">
                    {poundsFromBags(item.qty_bags, item.product?.bag_size_lb ?? 0.5).toFixed(1)} lbs
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3 text-sm font-semibold text-white">
              <span>Total bags</span>
              <span>{totals.bags}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Total weight</span>
              <span>{totals.pounds.toFixed(1)} lbs</span>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="text-lg font-semibold text-white">Pickup</h3>
            <p className="text-slate-200">{order.pickup?.pickup_location?.name ?? 'Pickup location'}</p>
            <p className="text-sm text-slate-300">{formatWindow(order.pickup?.start_time, order.pickup?.end_time)}</p>
            {order.pickup?.instructions && <p className="text-xs text-slate-400">{order.pickup.instructions}</p>}
            <div className="rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber-200">
              Payment collected at pickup.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-ember/50 hover:text-ember"
          >
            Back home
          </Link>
          <Link
            href="/frozen-drops"
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-black shadow-glow hover:translate-y-[-1px]"
          >
            View drops
          </Link>
        </div>
      </div>
    </section>
  );
}
