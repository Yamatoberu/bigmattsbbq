import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { DropNotificationEmail } from "../../../../emails/DropNotificationEmail";
import { logError } from "../../../../lib/logger";
import { getResendEnv } from "../../../../lib/env";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1).max(200),
  dropId: z.string().optional()
});

function authorize(requestHeaders: Headers): boolean {
  const secret = process.env.BROADCAST_SECRET;
  if (!secret || secret.length < 16) return false;
  const authHeader = requestHeaders.get("authorization");
  if (!authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (!authorize(request.headers)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid broadcast payload.", requestId },
        { status: 400 }
      );
    }

    const { subject, dropId } = parsed.data;

    let env: { apiKey: string; segmentId: string };
    try {
      env = getResendEnv();
    } catch (envErr) {
      logError("broadcast missing env vars", envErr, requestId);
      return NextResponse.json(
        { error: "Broadcast failed.", requestId },
        { status: 500 }
      );
    }

    const html = await render(
      <DropNotificationEmail subject={subject} dropId={dropId} />
    );

    const from =
      process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>";

    const resend = new Resend(env.apiKey);
    const { data, error } = await resend.broadcasts.create({
      segmentId: env.segmentId,
      from,
      subject,
      html,
      send: true
    });

    if (error) {
      logError("broadcast failed", error, requestId);
      return NextResponse.json(
        { error: "Broadcast failed.", requestId },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { id: data?.id, requestId },
      { status: 200 }
    );
  } catch (err) {
    logError("broadcast request failed", err, requestId);
    return NextResponse.json(
      { error: "Broadcast failed.", requestId },
      { status: 500 }
    );
  }
}
