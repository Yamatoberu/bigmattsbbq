import MailingListForm from '@/components/MailingListForm';
import PreorderForm from '@/components/PreorderForm';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { toNumberId } from '@/lib/supabase/ids';
import { formatWindow } from '@/lib/utils';

async function getLiveDrop() {
  try {
    const supabase = getSupabaseServiceRole();
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('id, name, starts_at, ends_at, hero_copy, drop_status:drop_status!inner(status, viewable)')
      .eq('drop_status.status', 'live')
      .eq('drop_status.viewable', true)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (dropError || !drop) return null;

    const dropId = toNumberId(drop.id);
    if (dropId === null) return null;

    const { data: inventoryRows } = await supabase
      .from('drop_inventory')
      .select('product_id, drop_id, bags_available, bags_reserved, bags_sold, enabled, product:products(name, bag_size_lb, description)')
      .eq('drop_id', dropId)
      .eq('enabled', true);

    const { data: pickups } = await supabase
      .from('drop_pickups')
      .select('id, start_time, end_time, instructions, enabled, pickup_location:pickup_locations(name, address)')
      .eq('drop_id', dropId)
      .eq('enabled', true);

    return {
      drop: { ...drop, id: dropId },
      products:
        inventoryRows
          ?.map((row) => {
            const productId = toNumberId(row.product_id);
            if (productId === null) return null;

            const product = Array.isArray(row.product) ? row.product[0] : row.product;
            const remaining = Math.max(
              (row.bags_available ?? 0) - (row.bags_reserved ?? 0) - (row.bags_sold ?? 0),
              0
            );

            return {
              productId,
              name: product?.name ?? 'Product',
              bagSize: product?.bag_size_lb ?? 0.5,
              remaining,
              description: product?.description ?? null
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null) ?? [],
      pickups:
        pickups
          ?.map((p) => {
            const pickupId = toNumberId(p.id);
            if (pickupId === null) return null;

            const pickupLocation = Array.isArray(p.pickup_location) ? p.pickup_location[0] : p.pickup_location;
            return {
              id: pickupId,
              label: pickupLocation?.name ?? 'Pickup',
              window: formatWindow(p.start_time, p.end_time),
              instructions: p.instructions ?? null
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null) ?? []
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
