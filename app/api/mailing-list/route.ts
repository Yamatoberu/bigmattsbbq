import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseClient } from "../../../lib/supabase";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email()
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email.", requestId },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("mailing_list")
      .insert({ email: parsed.data.email });

    // PostgreSQL unique_violation — already subscribed. Return silent success per D-08.
    if (error && (error as { code?: string }).code !== "23505") {
      logError("mailing-list insert failed", error, requestId);
      return NextResponse.json(
        { error: "Signup failed. Please try again.", requestId },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("mailing-list signup failed", err, requestId);
    return NextResponse.json(
      { error: "Signup failed. Please try again.", requestId },
      { status: 500 }
    );
  }
}
