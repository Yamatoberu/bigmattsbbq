import { Resend } from 'resend';

export type OrderEmailPayload = {
  orderNumber: string;
  customerName: string;
  items: { name: string; bags: number; pounds: number }[];
  pickup: {
    name: string;
    window: string;
    instructions?: string | null;
  };
};

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.EMAIL_FROM;
}

export async function sendOrderConfirmationEmail(payload: OrderEmailPayload, to: string) {
  const resend = getResend();
  const from = getFromAddress();
  if (!resend || !from) {
    return { sent: false, reason: 'RESEND_API_KEY or EMAIL_FROM not set' };
  }

  const subject = `Your Big Matt's BBQ preorder #${payload.orderNumber}`;
  const totalBags = payload.items.reduce((sum, i) => sum + i.bags, 0);
  const totalLbs = payload.items.reduce((sum, i) => sum + i.pounds, 0);

  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0b0c0f; color:#f9fafb; padding:24px;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;background:#111217;">
        <h1 style="margin:0 0 12px;font-size:22px;">Thanks for reserving BBQ!</h1>
        <p style="margin:0 0 12px;">Order <strong>#${payload.orderNumber}</strong> is confirmed. Pay at pickup.</p>
        <h3 style="margin:24px 0 8px;font-size:16px;">Items</h3>
        <ul style="padding-left:16px;margin:0;">
          ${payload.items
            .map(
              (i) =>
                `<li style="margin-bottom:6px;">${i.name} — ${i.bags} bag${i.bags === 1 ? '' : 's'} (${i.pounds.toFixed(
                  1
                )} lbs)</li>`
            )
            .join('')}
        </ul>
        <h3 style="margin:24px 0 8px;font-size:16px;">Pickup</h3>
        <p style="margin:0 0 6px;"><strong>${payload.pickup.name}</strong></p>
        <p style="margin:0 0 6px;">${payload.pickup.window}</p>
        ${
          payload.pickup.instructions
            ? `<p style="margin:0 0 6px; color:#cbd5e1;">${payload.pickup.instructions}</p>`
            : ''
        }
        <p style="margin:24px 0 0; color:#f97316;">Payment collected at pickup.</p>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo: process.env.EMAIL_REPLY_TO
  });

  if (error) return { sent: false, reason: error.message };
  return { sent: true, id: data?.id };
}
