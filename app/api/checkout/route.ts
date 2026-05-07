import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSquareEnv } from "../../../lib/env";
import { newIdempotencyKey } from "../../../lib/idempotency";
import {
  createCustomer,
  createInvoice,
  createOrder,
  publishInvoice,
  searchCustomerByEmail,
  SquareError
} from "../../../lib/square";
import { logError } from "../../../lib/logger";
import { getSupabaseClient } from "../../../lib/supabase";
import { checkDropReady } from "../../../lib/drops";
import { PACKAGES } from "../../../lib/config";

export const runtime = "nodejs";

export const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive(),
  productName: z.union([
    z.literal("pulled_pork"),
    z.literal("brisket"),
    z.literal("sauce"),
    z.literal("family_night"),
    z.literal("backyard_host"),
    z.literal("freezer_filler")
  ]).optional()
});

const checkoutSchema = z.object({
  dropId: z.string().uuid(),
  pickupOptionId: z.string().uuid(),
  packageId: z.string().optional(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  cart: z.array(cartSchema).min(1)
});

async function releaseReserved(
  supabase: ReturnType<typeof getSupabaseClient>,
  reserved: Array<{ productName: string; quantity: number }>,
  dropId: string,
  pickupOptionId: string,
  requestId: string
): Promise<void> {
  const results = await Promise.allSettled(
    reserved.map((r) =>
      supabase.rpc("release_pickup_slot", {
        p_drop_id: dropId,
        p_pickup_option_id: pickupOptionId,
        p_product_name: r.productName,
        p_quantity: r.quantity
      })
    )
  );
  for (const result of results) {
    if (result.status === "rejected") {
      logError("release_pickup_slot failed", result.reason, requestId);
    }
  }
}

export async function POST(request: Request) {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout payload.", requestId },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data: dropRow, error: dropErr } = await supabase
      .from("drops")
      .select("id, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, capacity_sauce, capacity_family_night, capacity_backyard_host, capacity_freezer_filler, reserved_pulled_pork, reserved_brisket, reserved_sauce, reserved_family_night, reserved_backyard_host, reserved_freezer_filler, capacity_enforced")
      .eq("id", parsed.data.dropId)
      .maybeSingle();

    if (dropErr) {
      logError("Checkout drop precheck failed", dropErr, requestId);
      return NextResponse.json(
        { error: "Unable to verify drop status.", requestId },
        { status: 500 }
      );
    }

    const readiness = checkDropReady(dropRow);
    if (!readiness.ok) {
      return NextResponse.json(
        { error: readiness.error, requestId },
        { status: readiness.status }
      );
    }

    const capacityEnforced = dropRow?.capacity_enforced ?? true;

    const { data: pickupRow, error: pickupErr } = await supabase
      .from("drop_pickup_options")
      .select(
        "id, location_label, pickup_at, pickup_date, capacity_pulled_pork, capacity_brisket, capacity_sauce, capacity_family_night, capacity_backyard_host, capacity_freezer_filler, reserved_pulled_pork, reserved_brisket, reserved_sauce, reserved_family_night, reserved_backyard_host, reserved_freezer_filler"
      )
      .eq("id", parsed.data.pickupOptionId)
      .eq("drop_id", parsed.data.dropId)
      .maybeSingle();

    if (pickupErr) {
      logError("Checkout pickup option lookup failed", pickupErr, requestId);
      return NextResponse.json(
        { error: "Unable to verify pickup option.", requestId },
        { status: 500 }
      );
    }

    if (!pickupRow) {
      return NextResponse.json(
        { error: "Pickup option not found for this drop.", requestId },
        { status: 404 }
      );
    }

    if (capacityEnforced) {
      const pickupSoldOut =
        pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork &&
        pickupRow.reserved_brisket >= pickupRow.capacity_brisket &&
        pickupRow.reserved_sauce >= pickupRow.capacity_sauce &&
        pickupRow.reserved_family_night >= pickupRow.capacity_family_night &&
        pickupRow.reserved_backyard_host >= pickupRow.capacity_backyard_host &&
        pickupRow.reserved_freezer_filler >= pickupRow.capacity_freezer_filler;
      if (pickupSoldOut) {
        return NextResponse.json(
          { error: "This pickup slot is sold out. Please choose another.", requestId },
          { status: 409 }
        );
      }
    }

    // Aggregate cart quantities by product type before reserving capacity.
    const totals = new Map<string, number>();
    for (const item of parsed.data.cart) {
      if (item.productName) {
        totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
      }
    }

    // Reserve capacity slots before touching Square. Roll back on any failure.
    const reserved: Array<{ productName: string; quantity: number }> = [];
    if (capacityEnforced) {
      for (const [productName, quantity] of totals) {
        const { data: reserveResult, error: reserveErr } = await supabase.rpc("reserve_pickup_slot", {
          p_drop_id: parsed.data.dropId,
          p_pickup_option_id: parsed.data.pickupOptionId,
          p_product_name: productName,
          p_quantity: quantity
        });
        const reserveData = reserveResult as { ok: boolean; reason?: string } | null;
        if (reserveErr || !reserveData?.ok) {
          await releaseReserved(supabase, reserved, parsed.data.dropId, parsed.data.pickupOptionId, requestId);
          return NextResponse.json(
            {
              error: reserveData?.reason ?? "Capacity unavailable for selected pickup.",
              requestId
            },
            { status: 409 }
          );
        }
        reserved.push({ productName, quantity });
      }
    }

    let orderId: string | undefined;
    let invoiceId: string | undefined;
    let pickupNote = "";

    try {
      const env = getSquareEnv();
      const { customer, cart } = parsed.data;

      const customerSearch = await searchCustomerByEmail({
        host: env.host,
        accessToken: env.accessToken,
        email: customer.email,
        requestId
      });

      let customerId = customerSearch.customers?.[0]?.id;

      if (!customerId) {
        const created = await createCustomer({
          host: env.host,
          accessToken: env.accessToken,
          requestId,
          idempotencyKey: newIdempotencyKey([
            customer.email,
            "customer"
          ]),
          body: {
            given_name: customer.firstName,
            family_name: customer.lastName,
            email_address: customer.email,
            phone_number: customer.phone
          }
        });

        customerId = created.customer?.id;
      }

      if (!customerId) {
        await releaseReserved(supabase, reserved, parsed.data.dropId, parsed.data.pickupOptionId, requestId);
        return NextResponse.json(
          { error: "Unable to create customer record.", requestId },
          { status: 500 }
        );
      }

      const pickupDateLabel = new Date(pickupRow.pickup_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Denver"
      });
      pickupNote = `${pickupRow.location_label} Pickup - ${pickupDateLabel}`;

      const orderResponse = await createOrder({
        host: env.host,
        accessToken: env.accessToken,
        requestId,
        idempotencyKey: newIdempotencyKey([
          customer.email,
          parsed.data.dropId,
          parsed.data.pickupOptionId,
          ...cart.map((c) => `${c.variationId}:${c.quantity}`),
          "order"
        ]),
        body: {
          order: {
            location_id: env.locationId,
            customer_id: customerId,
            line_items: [
              ...cart.map((item) => ({
                quantity: item.quantity.toString(),
                catalog_object_id: item.variationId
              })),
              ...((() => {
                const pkg = parsed.data.packageId
                  ? PACKAGES.find((p) => p.id === parsed.data.packageId)
                  : undefined;
                return pkg?.bundleVariationId
                  ? [{ quantity: "1", catalog_object_id: pkg.bundleVariationId, base_price_money: { amount: 0, currency: "USD" } }]
                  : [];
              })())
            ],
            fulfillments: [
              {
                type: "PICKUP",
                pickup_details: {
                  pickup_at: pickupRow.pickup_at,
                  note: pickupNote,
                  recipient: {
                    display_name: `${customer.firstName} ${customer.lastName}`
                  }
                }
              }
            ]
          }
        }
      });

      orderId = orderResponse.order?.id;

      if (!orderId) {
        await releaseReserved(supabase, reserved, parsed.data.dropId, parsed.data.pickupOptionId, requestId);
        return NextResponse.json(
          { error: "Unable to create order.", requestId },
          { status: 500 }
        );
      }

      const dueDate = new Date().toISOString().slice(0, 10);

      const invoiceResponse = await createInvoice({
        host: env.host,
        accessToken: env.accessToken,
        requestId,
        idempotencyKey: newIdempotencyKey([
          customer.email,
          parsed.data.dropId,
          parsed.data.pickupOptionId,
          orderId ?? "no-order",
          "invoice"
        ]),
        body: {
          invoice: {
            location_id: env.locationId,
            order_id: orderId,
            delivery_method: "EMAIL",
            primary_recipient: {
              customer_id: customerId
            },
            payment_requests: [
              {
                request_type: "BALANCE",
                due_date: dueDate
              }
            ],
            title: "Big Matt's BBQ Frozen Drop",
            description: "Thanks for locking in your frozen pickup."
          }
        }
      });

      invoiceId = invoiceResponse.invoice?.id;
      const invoiceVersion = invoiceResponse.invoice?.version;

      if (!invoiceId || invoiceVersion === undefined) {
        await releaseReserved(supabase, reserved, parsed.data.dropId, parsed.data.pickupOptionId, requestId);
        return NextResponse.json(
          { error: "Unable to create invoice.", requestId },
          { status: 500 }
        );
      }

      await publishInvoice({
        host: env.host,
        accessToken: env.accessToken,
        requestId,
        invoiceId,
        version: invoiceVersion,
        idempotencyKey: newIdempotencyKey([
          customer.email,
          parsed.data.dropId,
          invoiceId ?? "no-invoice",
          String(invoiceVersion ?? 0),
          "publish"
        ])
      });
    } catch (squareError) {
      // Square call failed — release reserved capacity so the slot is not stranded.
      await releaseReserved(supabase, reserved, parsed.data.dropId, parsed.data.pickupOptionId, requestId);
      throw squareError;
    }

    return NextResponse.json({
      orderId,
      invoiceId,
      pickupNote
    });
  } catch (error) {
    logError("Checkout failed", error, requestId);
    const status = error instanceof SquareError ? error.status : 500;
    return NextResponse.json(
      {
        error: "Checkout failed. Please try again or use the retry button.",
        requestId
      },
      { status }
    );
  }
}
