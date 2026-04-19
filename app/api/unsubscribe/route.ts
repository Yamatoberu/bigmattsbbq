import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseClient } from "../../../lib/supabase";
import { logError } from "../../../lib/logger";
import { verifyUnsubscribeToken } from "../../../lib/unsubscribeToken";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1)
});

export async function POST(request: Request) {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing token.", requestId },
        { status: 400 }
      );
    }

    let email: string;
    try {
      email = await verifyUnsubscribeToken(parsed.data.token);
    } catch (verifyErr) {
      logError("unsubscribe token verify failed", verifyErr, requestId);
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link.", requestId },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("mailing_list")
      .update({ subscribed: false })
      .eq("email", email);

    if (error) {
      logError("unsubscribe update failed", error, requestId);
      return NextResponse.json(
        { error: "Unsubscribe failed. Please try again.", requestId },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("unsubscribe request failed", err, requestId);
    return NextResponse.json(
      { error: "Unsubscribe failed. Please try again.", requestId },
      { status: 500 }
    );
  }
}
