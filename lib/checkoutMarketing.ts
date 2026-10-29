import "server-only";
import { Resend } from "resend";

function checked<T>(response: { data: T | null; error: unknown }): T {
  if (response.error || !response.data) throw new Error("Marketing provider request failed");
  return response.data;
}

async function allPages<T extends { id: string }>(
  load: (after?: string) => Promise<{ data: { data: T[]; has_more: boolean } | null; error: unknown }>
): Promise<T[]> {
  const items: T[] = [];
  let after: string | undefined;
  do {
    const page = checked(await load(after));
    items.push(...page.data);
    if (!page.has_more) return items;
    const next = page.data.at(-1)?.id;
    if (!next || next === after) throw new Error("Invalid marketing pagination");
    after = next;
  } while (true);
}

export async function subscribeToDropUpdates({ email, consent, requestId }: {
  email: string;
  consent: boolean;
  requestId: string;
}): Promise<void> {
  if (consent !== true) return;
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const segmentId = process.env.RESEND_SEGMENT_ID;
    const topicId = process.env.RESEND_BBQ_TOPIC_ID;
    if (!apiKey || !segmentId || !topicId) throw new Error("Missing checkout marketing configuration");
    const resend = new Resend(apiKey);
    const normalizedEmail = email.trim().toLowerCase();
    let contact = await resend.contacts.get({ email: normalizedEmail });
    if (contact.error?.name === "not_found") {
      const created = await resend.contacts.create({
        email: normalizedEmail,
        segments: [{ id: segmentId }],
        topics: [{ id: topicId, subscription: "opt_in" }]
      });
      if (!created.error) {
        checked(created);
        return;
      }
      // A competing request can win between lookup and create. Read the winner before changing its subscription state.
      if (created.error.statusCode !== 409 && created.error.name !== "validation_error") {
        checked(created);
      }
      contact = await resend.contacts.get({ email: normalizedEmail });
    }
    const existing = checked(contact);
    const id = existing.id;
    const segments = await allPages((after) => resend.contacts.segments.list({ contactId: id, after }));
    if (!segments.some((segment) => segment.id === segmentId)) {
      checked(await resend.contacts.segments.add({ contactId: id, segmentId }));
    }
    const topics = await allPages((after) => resend.contacts.topics.list({ id, after }));
    if (existing.unsubscribed) {
      checked(await resend.contacts.topics.update({ id, topics: [
        ...topics.filter((topic) => topic.id !== topicId && topic.subscription !== "opt_out")
          .map((topic) => ({ id: topic.id, subscription: "opt_out" as const })),
        { id: topicId, subscription: "opt_in" }
      ] }));
      checked(await resend.contacts.update({ id, unsubscribed: false }));
      return;
    }
    if (!topics.some((topic) => topic.id === topicId && topic.subscription === "opt_in")) {
      checked(await resend.contacts.topics.update({ id, topics: [{ id: topicId, subscription: "opt_in" }] }));
    }
  } catch {
    console.error({ message: "Checkout marketing subscription failed", requestId });
  }
}
