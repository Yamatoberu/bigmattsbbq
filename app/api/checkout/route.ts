import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSquareEnv } from "../../../lib/env";
import { newIdempotencyKey } from "../../../lib/idempotency";
import {
  buildAttributionMetadata,
  createCustomer,
  createInvoice,
  createOrder,
  mapCatalogToFrozenItems,
  publishInvoice,
  searchCatalogItems,
  searchCustomerByEmail,
  SquareError
} from "../../../lib/square";
import { logError } from "../../../lib/logger";
import { getSupabaseClient } from "../../../lib/supabase";
import { checkDropReady, formatPickupWindow } from "../../../lib/drops";
import { resolveAttributionLabel } from "../../../lib/attributionSources";
import { PICKUP_TIME_ZONE, zonedNoonToUtcISO } from "../../../lib/timezone";
import { formatMoney } from "../../../lib/format";
import type { Json } from "../../../lib/database.types";

export const runtime = "nodejs";

function escapeSlackText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function markOrderFailed(
  supabase: ReturnType<typeof getSupabaseClient>,
  orderRowId: string,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ order_status: "failed" })
    .eq("id", orderRowId);

  if (error) {
    logError("Failed to mark order as failed", error, requestId);
  }
}

function notifySlackNewOrder({
  customer,
  lineItems,
  totalAmountCents,
  locationLabel,
  pickupDateLabel,
  orderRecordId,
  squareOrderId,
  attributionLabel,
  attributionDetail,
}: {
  customer: { firstName: string; lastName: string; email: string };
  lineItems: Array<{ name?: string; quantity?: string }>;
  totalAmountCents?: number;
  locationLabel: string;
  pickupDateLabel: string;
  orderRecordId: string;
  squareOrderId: string;
  attributionLabel?: string;
  attributionDetail?: string;
}): void {
  const webhookUrl = process.env.SLACK_ORDERS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines = lineItems
    .filter((item) => item.name)
    .map((item) => `  • ${escapeSlackText(item.name!)} × ${item.quantity ?? "1"}`);

  const message = [
    "New Order — Big Matt's BBQ",
    "",
    `Customer: ${escapeSlackText(customer.firstName)} ${escapeSlackText(customer.lastName)} · ${escapeSlackText(customer.email)}`,
    "Order:",
    ...lines,
    ...(typeof totalAmountCents === "number" ? [`Total: ${formatMoney(totalAmountCents)}`] : []),
    `Pickup: ${locationLabel} — ${pickupDateLabel}`,
    ...(attributionLabel
      ? [
          `Heard about us: ${escapeSlackText(attributionLabel)}${attributionDetail ? ` (${escapeSlackText(attributionDetail)})` : ""}`
        ]
      : []),
    `Order ID: ${orderRecordId}`,
    `Square Order: ${squareOrderId}`,
  ].join("\n");

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  }).catch((err) => {
    console.warn("Slack order notification failed", err);
  });
}

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
    phone: z.string().optional(),
    // Intentionally unconstrained here — attribution is optional metadata sourced from an
    // operator-editable Supabase table with no deploy gate on `code`/`detail` shape. Bounds
    // are enforced separately below via sanitizeAttribution() so a malformed value degrades
    // to "no attribution" instead of ever failing the checkout (D-10).
    attributionSourceCode: z.string().optional(),
    attributionDetail: z.string().optional()
  }),
  cart: z.array(cartSchema).min(1)
});

const attributionSourceCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-zA-Z0-9_-]+$/);
const attributionDetailSchema = z.string().trim().min(1).max(255);

function sanitizeAttribution(
  rawCode: string | undefined,
  rawDetail: string | undefined,
  requestId: string
): { code?: string; detail?: string } {
  const codeResult = attributionSourceCodeSchema.safeParse(rawCode);
  if (rawCode !== undefined && !codeResult.success) {
    logError("Dropped malformed attribution source code (never blocks checkout)", codeResult.error, requestId);
  }
  if (!codeResult.success) {
    return {};
  }

  const detailResult = attributionDetailSchema.safeParse(rawDetail);
  return {
    code: codeResult.data,
    detail: detailResult.success ? detailResult.data : undefined
  };
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
      .select("id, status, order_cutoff_at")
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

    const { data: pickupRow, error: pickupErr } = await supabase
      .from("drop_pickup_options")
      .select("id, location_label, pickup_date, pickup_start_date, pickup_end_date")
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

    const env = getSquareEnv();

    let catalogByVariationId: Map<
      string,
      { itemId: string; itemName: string; variationName: string; unitPriceCents: number }
    >;

    try {
      const { items, relatedObjects } = await searchCatalogItems({
        host: env.host,
        accessToken: env.accessToken,
        categoryId: env.frozenCategoryId,
        requestId
      });
      const frozenItems = mapCatalogToFrozenItems({ items, relatedObjects });

      catalogByVariationId = new Map();
      for (const item of frozenItems) {
        for (const variation of item.variations) {
          catalogByVariationId.set(variation.variationId, {
            itemId: item.itemId,
            itemName: item.name,
            variationName: variation.name,
            unitPriceCents: variation.priceCents
          });
        }
      }
    } catch (catalogError) {
      logError("Checkout catalog lookup failed", catalogError, requestId);
      return NextResponse.json(
        { error: "Unable to price your order right now. Please try again.", requestId },
        { status: 500 }
      );
    }

    const missingVariationIds = parsed.data.cart
      .filter((item) => !catalogByVariationId.has(item.variationId))
      .map((item) => item.variationId);

    if (missingVariationIds.length > 0) {
      logError(
        "Checkout cart contained unknown catalog variation ids",
        { missing: missingVariationIds },
        requestId
      );
      return NextResponse.json(
        {
          error: "One or more items are no longer available. Please refresh and try again.",
          requestId
        },
        { status: 400 }
      );
    }

    const { data: orderRow, error: orderInsertErr } = await supabase
      .from("orders")
      .insert({
        drop_id: parsed.data.dropId,
        pickup_option_id: parsed.data.pickupOptionId,
        customer_email: parsed.data.customer.email,
        customer_name: `${parsed.data.customer.firstName} ${parsed.data.customer.lastName}`,
        cart_snapshot: parsed.data.cart as unknown as Json,
        order_status: "pending",
        payment_status: "unpaid"
      })
      .select("id")
      .single();

    if (orderInsertErr || !orderRow) {
      logError("Checkout order persistence failed", orderInsertErr, requestId);
      return NextResponse.json(
        { error: "Unable to record your order. Please try again.", requestId },
        { status: 500 }
      );
    }

    const orderRecordId = orderRow.id;

    const orderItemRows = parsed.data.cart.map((item) => {
      const snapshot = catalogByVariationId.get(item.variationId)!;
      return {
        order_id: orderRecordId,
        variation_id: item.variationId,
        item_id: snapshot.itemId,
        item_name: snapshot.itemName,
        variation_name: snapshot.variationName,
        quantity: item.quantity,
        unit_price_cents: snapshot.unitPriceCents
      };
    });

    const { error: itemsInsertErr } = await supabase.from("order_items").insert(orderItemRows);

    if (itemsInsertErr) {
      logError("Checkout order items persistence failed", itemsInsertErr, requestId);
      const { error: deleteErr } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderRecordId);

      if (deleteErr) {
        logError(
          "Failed to delete orders row after order_items insert failure",
          deleteErr,
          requestId
        );
      }

      return NextResponse.json(
        { error: "Unable to record your order. Please try again.", requestId },
        { status: 500 }
      );
    }

    let orderId: string | undefined;
    let invoiceId: string | undefined;
    let pickupNote = "";

    try {
      const { customer, cart } = parsed.data;
      const attribution = sanitizeAttribution(
        customer.attributionSourceCode,
        customer.attributionDetail,
        requestId
      );

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
        await markOrderFailed(supabase, orderRecordId, requestId);
        return NextResponse.json(
          { error: "Unable to create customer record.", requestId },
          { status: 500 }
        );
      }

      const pickupDateLabel = formatPickupWindow(pickupRow.pickup_start_date, pickupRow.pickup_end_date);
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
            line_items: cart.map((item) => ({
              quantity: item.quantity.toString(),
              catalog_object_id: item.variationId
            })),
            fulfillments: [
              {
                type: "PICKUP",
                pickup_details: {
                  pickup_at: zonedNoonToUtcISO(pickupRow.pickup_start_date, PICKUP_TIME_ZONE),
                  note: pickupNote,
                  recipient: {
                    display_name: `${customer.firstName} ${customer.lastName}`
                  }
                }
              }
            ],
            metadata: buildAttributionMetadata({
              code: attribution.code,
              detail: attribution.detail
            })
          }
        }
      });

      orderId = orderResponse.order?.id;

      if (!orderId) {
        await markOrderFailed(supabase, orderRecordId, requestId);
        return NextResponse.json(
          { error: "Unable to create order.", requestId },
          { status: 500 }
        );
      }

      const { error: orderUpdateErr } = await supabase
        .from("orders")
        .update({
          square_order_id: orderId,
          total_amount_cents: orderResponse.order?.total_money?.amount ?? null
        })
        .eq("id", orderRecordId);

      if (orderUpdateErr) {
        logError("Checkout order update (square_order_id) failed", orderUpdateErr, requestId);
      }

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
                due_date: pickupRow.pickup_date
              }
            ],
            accepted_payment_methods: {
              card: true
            },
            title: "Big Matt's BBQ Frozen Drop",
            description: "Thanks for locking in your frozen pickup."
          }
        }
      });

      invoiceId = invoiceResponse.invoice?.id;
      const invoiceVersion = invoiceResponse.invoice?.version;

      if (!invoiceId || invoiceVersion === undefined) {
        await markOrderFailed(supabase, orderRecordId, requestId);
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

      const { error: invoiceUpdateErr } = await supabase
        .from("orders")
        .update({
          square_invoice_id: invoiceId,
          order_status: "invoiced"
        })
        .eq("id", orderRecordId);

      if (invoiceUpdateErr) {
        logError("Checkout order update (invoiced) failed", invoiceUpdateErr, requestId);
      }

      const resolvedAttributionLabel = attribution.code
        ? await resolveAttributionLabel(attribution.code)
        : undefined;

      notifySlackNewOrder({
        customer,
        lineItems: orderResponse.order?.line_items ?? [],
        totalAmountCents: orderResponse.order?.total_money?.amount,
        locationLabel: pickupRow.location_label,
        pickupDateLabel,
        orderRecordId,
        squareOrderId: orderId ?? "",
        attributionLabel: resolvedAttributionLabel ?? attribution.code,
        attributionDetail: attribution.detail
      });
    } catch (squareError) {
      await markOrderFailed(supabase, orderRecordId, requestId);
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
