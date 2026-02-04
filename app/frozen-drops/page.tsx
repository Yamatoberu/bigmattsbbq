import MailingListForm from '@/components/MailingListForm';
import PreorderForm from '@/components/PreorderForm';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { formatWindow } from '@/lib/utils';

async function getLiveDrop() {
  try {
    const supabase = getSupabaseServiceRole();
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('*')
      .eq('status', 'live')
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (dropError || !drop) return null;

    const { data: inventoryRows } = await supabase
      .from('v_drop_inventory_remaining')
      .select('product_id, drop_id, bags_remaining, product:products(name, bag_size_lb, description)')
      .eq('drop_id', drop.id)
      .eq('enabled', true);

    const { data: pickups } = await supabase
      .from('drop_pickups')
      .select('id, start_time, end_time, instructions, enabled, pickup_location:pickup_locations(name, address)')
      .eq('drop_id', drop.id)
      .eq('enabled', true);

    return {
      drop,
      products:
        inventoryRows?.map((row) => ({
          productId: row.product_id,
          name: row.product?.name ?? 'Product',
          bagSize: row.product?.bag_size_lb ?? 0.5,
          remaining: row.bags_remaining ?? 0,
          description: row.product?.description ?? null
        })) ?? [],
      pickups:
        pickups?.map((p) => ({
          id: p.id,
          label: p.pickup_location?.name ?? 'Pickup',
          window: formatWindow(p.start_time, p.end_time),
          instructions: p.instructions ?? null
        })) ?? []
    };
  } catch (err) {
    console.error('Live drop fetch failed', err);
    return null;
  }
}

export default async function FrozenDropsPage() {
  const data = await getLiveDrop();

  if (!data || data.products.length === 0 || data.pickups.length === 0) {
    return (
      <section className="section">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-3xl font-semibold text-white">Frozen Drops</h1>
          <div className="card space-y-3">
            <p className="text-lg font-semibold text-white">No active drop right now.</p>
            <p className="text-slate-300">
              Join the list and we&apos;ll email you when the next batch of frozen BBQ goes live.
            </p>
            <MailingListForm />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.18em] text-ember">Now live</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">{data.drop.name}</h1>
          <p className="text-slate-300">
            Reserve your bags, choose pickup, and pay at pickup. Inventory is first-come, first-served.
          </p>
        </div>

        <PreorderForm
          dropId={data.drop.id}
          dropName={data.drop.name}
          products={data.products}
          pickups={data.pickups}
        />
      </div>
    </section>
  );
}
