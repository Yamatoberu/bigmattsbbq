import { NextResponse, after } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { logError } from "../../../lib/logger";
import { getResendEnv, type ResendEnv } from "../../../lib/env";

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

async function shouldSendWelcome(
  resend: Resend,
  audienceId: string,
  email: string
): Promise<boolean> {
  try {
    const { data, error } = await resend.contacts.get({ email, audienceId });
    if (error?.name === "not_found") return true;
    if (error) {
      console.warn("mailing-list contact lookup failed", error);
      return false;
    }
    if (data?.unsubscribed === true) return true;
    return false;
  } catch (err) {
    console.warn("mailing-list contact lookup failed", err);
    return false;
  }
}

async function triggerWelcomeAutomation(
  resend: Resend,
  event: string,
  email: string,
  firstName: string
): Promise<void> {
  try {
    const { error } = await resend.events.send({
      event,
      email,
      payload: { FIRST_NAME: firstName }
    });
    if (error) {
      console.warn("welcome automation trigger failed", error);
    }
  } catch (err) {
    console.warn("welcome automation trigger failed", err);
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

    let env: ResendEnv;
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
    const welcomeEvent = env.welcomeEvent;
    const shouldWelcome = welcomeEvent
      ? await shouldSendWelcome(resend, env.audienceId, parsed.data.email)
      : false;

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

    if (shouldWelcome && welcomeEvent) {
      after(() =>
        triggerWelcomeAutomation(resend, welcomeEvent, parsed.data.email, parsed.data.firstName)
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
