// ─── Meta Graph API helpers ─────────────────────────────────────────────────
// Handles sending messages across WhatsApp, Instagram, and Facebook Messenger
// using Meta's unified Graph API.

const META_API = "https://graph.facebook.com/v21.0";
const TOKEN = () => process.env.META_API_TOKEN!;

// ─── WhatsApp ───────────────────────────────────────────────────────────────

export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const res = await fetch(`${META_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Meta API] WhatsApp send error:", err);
  }

  return res.ok;
}

// Mark a message as read (blue checkmarks)
export async function markWhatsAppRead(phoneNumberId: string, messageId: string) {
  await fetch(`${META_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// ─── Instagram (future) ─────────────────────────────────────────────────────

export async function sendInstagramMessage(recipientId: string, text: string) {
  const pageId = process.env.META_IG_PAGE_ID;
  if (!pageId) return false;

  const res = await fetch(`${META_API}/${pageId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Meta API] Instagram send error:", err);
  }

  return res.ok;
}

// ─── Facebook Messenger (future) ────────────────────────────────────────────

export async function sendFacebookMessage(recipientId: string, text: string) {
  const pageId = process.env.META_FB_PAGE_ID;
  if (!pageId) return false;

  const res = await fetch(`${META_API}/${pageId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Meta API] Facebook send error:", err);
  }

  return res.ok;
}

// ─── Platform detection from webhook payload ────────────────────────────────

export type MetaPlatform = "whatsapp" | "instagram" | "facebook";

export function detectPlatform(body: Record<string, unknown>): MetaPlatform {
  const obj = body.object as string;
  if (obj === "whatsapp_business_account") return "whatsapp";
  if (obj === "instagram") return "instagram";
  return "facebook"; // "page" object = Messenger
}
