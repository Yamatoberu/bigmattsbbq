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

export const runtime = "nodejs";

const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive()
});

const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  pickup: z.object({
    locationLabel: z.enum(["Preston", "Orem"]),
    pickupDateLabel: z.string().min(1),
    pickupAtISO: z.string().datetime()
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

    const env = getSquareEnv();
    const { customer, pickup, cart } = parsed.data;

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

    const pickupNote = `${pickup.locationLabel} Pickup - ${pickup.pickupDateLabel}`;

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
                pickup_at: pickup.pickupAtISO,
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
