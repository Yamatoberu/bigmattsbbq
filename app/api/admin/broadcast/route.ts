import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getSupabaseClient } from "../../../../lib/supabase";
import { logError } from "../../../../lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  dropId: z.string().optional()
});

function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\shref\s*=\s*["']javascript:[^"']*/gi, ' href="#"');
}

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

    const { subject, html, dropId } = parsed.data;
    const safeHtml = sanitize(html);

    const supabase = getSupabaseClient();
    const { data: subscribers, error: listErr } = await supabase
      .from("mailing_list")
      .select("email")
      .eq("subscribed", true);

    if (listErr) {
      logError("broadcast subscriber fetch failed", listErr, requestId);
      return NextResponse.json(
        { error: "Broadcast failed.", requestId },
        { status: 500 }
      );
    }

    const list: Array<{ email: string }> = subscribers ?? [];
    if (list.length === 0) {
      return NextResponse.json(
        { sent: 0, failed: 0, requestId },
        { status: 200 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      logError("broadcast missing RESEND_API_KEY", new Error("RESEND_API_KEY not set"), requestId);
      return NextResponse.json(
        { error: "Broadcast failed.", requestId },
        { status: 500 }
      );
    }
    const resend = new Resend(resendKey);
    const from = process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>";
    const template = dropId ? `drop_notification:${dropId}` : "drop_notification";

    let sent = 0;
    let failed = 0;

    for (const subscriber of list) {
      let resendId: string | null = null;
      let status: "sent" | "failed" = "sent";
      try {
        const { data, error: sendErr } = await resend.emails.send({
          from,
          to: subscriber.email,
          subject,
          html: safeHtml
        });

        if (sendErr) {
          status = "failed";
          logError("broadcast send failed for recipient", sendErr, requestId);
        } else {
          resendId = data?.id ?? null;
          sent += 1;
        }
      } catch (sendCatch) {
        status = "failed";
        logError("broadcast send threw for recipient", sendCatch, requestId);
      }

      if (status === "failed") failed += 1;

      const { error: logErr } = await supabase.from("email_logs").insert({
        recipient: subscriber.email,
        template,
        status,
        resend_id: resendId
      });
      if (logErr) {
        logError("broadcast email_logs insert failed", logErr, requestId);
      }
    }

    return NextResponse.json({ sent, failed, requestId }, { status: 200 });
  } catch (err) {
    logError("broadcast request failed", err, requestId);
    return NextResponse.json(
      { error: "Broadcast failed.", requestId },
      { status: 500 }
    );
  }
}
