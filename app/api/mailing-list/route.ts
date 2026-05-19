import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { logError } from "../../../lib/logger";
import { getResendEnv } from "../../../lib/env";

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

    let env: { apiKey: string; audienceId: string };
    try {
      env = getResendEnv();
    } catch (envErr) {
      logError("mailing-list missing env vars", envErr, requestId);
      return NextResponse.json(
        { error: "Signup failed. Please try again.", requestId },
        { status: 500 }
      );
    }

    const resend = new Resend(env.apiKey);
    const { error } = await resend.contacts.create({
      audienceId: env.audienceId,
      email: parsed.data.email,
      unsubscribed: false
    });

    if (error) {
      logError("mailing-list contact create failed", error, requestId);
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
