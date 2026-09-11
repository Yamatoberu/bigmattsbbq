import { NextResponse, after } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { logError } from "../../../lib/logger";
import { getResendEnv } from "../../../lib/env";

export const runtime = "nodejs";

function escapeSlackText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notifySlackNewSubscriber({
  email,
  firstName,
  signedUpAt
}: {
  email: string;
  firstName: string;
  signedUpAt: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_EMAIL_WEBHOOK_URL;
  if (!webhookUrl) return;

  const message = [
    "New Email Subscriber — Big Matt's BBQ",
    "",
    `Name: ${escapeSlackText(firstName)}`,
    `Email: ${escapeSlackText(email)}`,
    `Signed up: ${signedUpAt}`
  ].join("\n");

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message })
    });
    if (!res.ok) {
      console.warn("Slack subscriber notification failed", res.status);
    }
  } catch (err) {
    console.warn("Slack subscriber notification failed", err);
  }
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid name or email.", requestId },
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
      firstName: parsed.data.firstName,
      unsubscribed: false
    });

    if (error) {
      logError("mailing-list contact create failed", error, requestId);
      return NextResponse.json(
        { error: "Signup failed. Please try again.", requestId },
        { status: 500 }
      );
    }

    after(() =>
      notifySlackNewSubscriber({
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        signedUpAt: new Date().toISOString()
      })
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("mailing-list signup failed", err, requestId);
    return NextResponse.json(
      { error: "Signup failed. Please try again.", requestId },
      { status: 500 }
    );
  }
}
