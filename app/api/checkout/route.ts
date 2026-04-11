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

export const runtime = "nodejs";

const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive()
});

const checkoutSchema = z.object({
  dropId: z.string().uuid(),
  pickupOptionId: z.string().uuid(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  cart: z.array(cartSchema).min(1)
});

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
      .select("id, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket")
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
      .select("id, location_label, pickup_at, pickup_date")
      .eq("id", parsed.data.pickupOptionId)
      .eq("drop_id", parsed.data.dropId)
      .maybeSingle();

    if (pickupErr || !pickupRow) {
      logError(
        "Checkout pickup option lookup failed",
        pickupErr ?? new Error("pickup option not found"),
        requestId
      );
      return NextResponse.json(
        { error: "Pickup option not found for this drop.", requestId },
        { status: 404 }
      );
    }

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
        idempotencyKey: newIdempotencyKey(),
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
    const pickupNote = `${pickupRow.location_label} Pickup - ${pickupDateLabel}`;

    const orderResponse = await createOrder({
      host: env.host,
      accessToken: env.accessToken,
      requestId,
      idempotencyKey: newIdempotencyKey(),
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

    const orderId = orderResponse.order?.id;

    if (!orderId) {
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
      idempotencyKey: newIdempotencyKey(),
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

    const invoiceId = invoiceResponse.invoice?.id;
    const invoiceVersion = invoiceResponse.invoice?.version;

    if (!invoiceId || invoiceVersion === undefined) {
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
      idempotencyKey: newIdempotencyKey()
    });

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
