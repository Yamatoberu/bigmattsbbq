'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { poundsFromBags, formatWindow } from '@/lib/utils';
import { sendOrderConfirmationEmail } from '@/lib/email';

type ActionState = { status: 'idle' | 'success' | 'error'; message?: string };

const mailingListSchema = z.object({
  email: z.string().email(),
  source: z.string().default('site')
});

export async function subscribeToMailingList(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = mailingListSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source') ?? 'site'
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Please enter a valid email.' };
  }

  try {
    const supabase = getSupabaseServiceRole();
    const { error } = await supabase
      .from('mailing_list_subscribers')
      .upsert(
        {
          email: parsed.data.email,
          source: parsed.data.source,
          subscribed_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      );

    if (error) throw error;

    await supabase.from('email_log').insert({
      email_type: 'mailing_list',
      to_email: parsed.data.email,
      status: 'logged',
      message: 'Mailing list signup'
    });

    return { status: 'success', message: 'You are on the list!' };
  } catch (err) {
    console.error(err);
    return { status: 'error', message: 'Could not add you right now. Please try again.' };
  }
}

const preorderSchema = z.object({
  drop_id: z.string().uuid(),
  pickup_id: z.string().uuid(),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  opt_in: z.coerce.boolean().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().positive()
      })
    )
    .min(1)
});

export type PreorderActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export async function placePreorderAction(_prev: PreorderActionState, formData: FormData): Promise<PreorderActionState> {
  const itemsRaw = formData.get('items');
  let items: unknown = [];
  if (typeof itemsRaw === 'string') {
    try {
      items = JSON.parse(itemsRaw);
    } catch (err) {
      console.error('Items JSON parse failed', err);
    }
  }

  const parsed = preorderSchema.safeParse({
    drop_id: formData.get('drop_id'),
    pickup_id: formData.get('pickup_id'),
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? undefined,
    opt_in: formData.get('opt_in') === 'on' || formData.get('opt_in') === 'true',
    items
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Please check your info and quantities.' };
  }

  const payload = parsed.data;

  try {
    const supabase = getSupabaseServiceRole();

    // Run atomic RPC in the database
    const { data: rpcData, error: rpcError } = await supabase.rpc('place_preorder', {
      drop_id: payload.drop_id,
      pickup_id: payload.pickup_id,
      items: payload.items,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone ?? null,
      opt_in: payload.opt_in ?? false
    });

    if (rpcError || !rpcData) {
      throw rpcError ?? new Error('Unknown error placing preorder');
    }

    const orderId = rpcData.order_id ?? rpcData.orderId;
    const orderNumber = rpcData.order_number ?? rpcData.orderNumber;

    // Fetch order details for email + confirmation
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        full_name,
        email,
        drop_pickup:drop_pickups!orders_pickup_id_fkey (
          start_time,
          end_time,
          instructions,
          pickup_location:pickup_locations(name)
        ),
        order_items:order_items (
          qty_bags,
          product:products(name, bag_size_lb)
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    let emailStatus = 'not_sent';
    let emailMessage = 'Skipped — RESEND_API_KEY or EMAIL_FROM missing';

    if (order?.email) {
      const sendResult = await sendOrderConfirmationEmail(
        {
          orderNumber: order.order_number,
          customerName: order.full_name,
          items:
            order.order_items?.map((item) => ({
              name: item.product?.name ?? 'Item',
              bags: item.qty_bags,
              pounds: poundsFromBags(item.qty_bags, item.product?.bag_size_lb ?? 0.5)
            })) ?? [],
          pickup: {
            name: order.drop_pickup?.pickup_location?.name ?? 'Pickup',
            window: formatWindow(order.drop_pickup?.start_time, order.drop_pickup?.end_time),
            instructions: order.drop_pickup?.instructions
          }
        },
        order.email
      );

      emailStatus = sendResult.sent ? 'sent' : 'failed';
      emailMessage = sendResult.sent ? 'Email sent via Resend' : sendResult.reason ?? 'Email not sent';
    }

    await supabase.from('email_log').insert({
      order_id: orderId,
      email_type: 'confirmation',
      to_email: order?.email ?? payload.email,
      status: emailStatus,
      message: emailMessage
    });

    if (payload.opt_in) {
      await supabase
        .from('mailing_list_subscribers')
        .upsert({ email: payload.email, source: 'preorder', subscribed_at: new Date().toISOString() }, { onConflict: 'email' });
    }

    redirect(`/order-confirmation?order=${orderNumber}`);
  } catch (err) {
    console.error(err);
    return {
      status: 'error',
      message: 'Could not place your preorder. Please retry.'
    };
  }
}
