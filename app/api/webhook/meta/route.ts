// ─── Meta Webhook Handler ───────────────────────────────────────────────────
// Replaces the entire n8n workflow. Handles:
// 1. Webhook verification (GET)
// 2. Incoming messages from WhatsApp (POST)
// 3. Future: Instagram + Facebook Messenger
//
// Flow: Receive message → Save to Supabase → Check AI enabled → Generate response → Send back

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, markWhatsAppRead, detectPlatform } from "@/lib/meta-api";
import { generateBotResponse } from "@/lib/ai-bot";

// Server-side Supabase client (not browser client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── GET: Webhook Verification ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("[Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Verification failed — token mismatch");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: Incoming Messages ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = detectPlatform(body);

    // Always respond 200 immediately (Meta requires fast acknowledgement)
    // Process async below

    if (platform === "whatsapp") {
      await handleWhatsApp(body);
    }
    // Future platforms:
    // if (platform === "instagram") await handleInstagram(body);
    // if (platform === "facebook") await handleFacebook(body);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return NextResponse.json({ status: "ok" }); // Always 200 to prevent retries
  }
}

// ─── WhatsApp Message Handler ───────────────────────────────────────────────

async function handleWhatsApp(body: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (body.entry as any[])?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages || value.messages.length === 0) {
    // Status update (delivered, read), not a message — ignore
    return;
  }

  const message = value.messages[0];
  const phoneNumberId = value.metadata?.phone_number_id;
  const senderPhone = message.from; // e.g., "59899123456"
  const senderName = value.contacts?.[0]?.profile?.name ?? "Sin nombre";
  const messageId = message.id;

  // Only handle text messages for now
  if (message.type !== "text") {
    console.log(`[Webhook] Ignoring non-text message type: ${message.type}`);
    return;
  }

  const text = message.text?.body ?? "";
  console.log(`[Webhook] WhatsApp from ${senderName} (${senderPhone}): ${text}`);

  // Mark message as read (blue checkmarks)
  if (phoneNumberId && messageId) {
    await markWhatsAppRead(phoneNumberId, messageId);
  }

  // ─── 1. Find or create contact ──────────────────────────────────────────

  let contact = await findContact(senderPhone);

  if (!contact) {
    contact = await createContact(senderPhone, senderName);
    if (!contact) {
      console.error("[Webhook] Could not find or create contact for:", senderPhone);
      return;
    }
  }

  // ─── 2. Save inbound message to Supabase ────────────────────────────────

  await supabase.from("messages").insert({
    contact_id: contact.id,
    text,
    direction: "inbound",
    status: "delivered",
  });

  // Update contact's last message + increment unread
  await supabase
    .from("contacts")
    .update({
      last_message: text,
      last_message_time: new Date().toISOString(),
      unread_count: (contact.unread_count ?? 0) + 1,
    })
    .eq("id", contact.id);

  // ─── 3. Check if AI is enabled ──────────────────────────────────────────

  if (!contact.ai_enabled) {
    console.log(`[Webhook] AI disabled for ${senderName} — skipping auto-reply`);
    return;
  }

  // ─── 4. Load conversation history for context ───────────────────────────

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("text, direction")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(11);

  const allHistory = (recentMessages ?? []).reverse();
  // Exclude the message we just saved (last one)
  const history = allHistory.slice(0, -1).map((m) => ({
    role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
    content: m.text ?? "",
  }));

  // First message = no prior history before the current one
  const isFirstMessage = allHistory.length <= 1;

  // ─── 5. Generate AI response ────────────────────────────────────────────

  console.log(`[Webhook] Generating AI response for ${senderName} (first: ${isFirstMessage})...`);
  const botResponse = await generateBotResponse(text, history, isFirstMessage);
  console.log(`[Webhook] AI response: ${botResponse.text.substring(0, 100)}...`);

  // ─── 6. Send response via WhatsApp ──────────────────────────────────────

  const sent = await sendWhatsAppMessage(phoneNumberId, senderPhone, botResponse.text);

  if (sent) {
    // Save outbound message to Supabase
    await supabase.from("messages").insert({
      contact_id: contact.id,
      text: botResponse.text,
      direction: "outbound",
      status: "sent",
    });

    // Update last message preview
    await supabase
      .from("contacts")
      .update({
        last_message: botResponse.text,
        last_message_time: new Date().toISOString(),
      })
      .eq("id", contact.id);
  }

  // ─── 7. Handle handoff to human ─────────────────────────────────────────

  if (botResponse.handoff) {
    console.log(`[Webhook] Handoff: disabling AI and labeling contact ${contact.id}`);

    // Disable AI for this contact
    await supabase
      .from("contacts")
      .update({ ai_enabled: false, conversation_status: "pending" })
      .eq("id", contact.id);

    // Add "Asistente" label (orange)
    const ASISTENTE_LABEL_ID = "3e425a8b-5422-49cc-a18f-2a4292e55776";
    await supabase
      .from("contact_labels")
      .upsert(
        { contact_id: contact.id, label_id: ASISTENTE_LABEL_ID },
        { onConflict: "contact_id,label_id" }
      );

    console.log(`[Webhook] Contact ${contact.name} transferred to human ✓`);
  }
}

// ─── Database helpers ───────────────────────────────────────────────────────

interface ContactRow {
  id: string;
  phone: string;
  name: string;
  ai_enabled: boolean;
  unread_count: number;
}

async function findContact(phone: string): Promise<ContactRow | null> {
  // Try exact match first
  const { data } = await supabase
    .from("contacts")
    .select("id, phone, name, ai_enabled, unread_count")
    .eq("phone", phone)
    .single();

  if (data) return data as ContactRow;

  // Try without country code prefix variations
  // e.g., "59899123456" might be stored as "099123456" or vice versa
  const { data: fuzzy } = await supabase
    .from("contacts")
    .select("id, phone, name, ai_enabled, unread_count")
    .or(`phone.like.%${phone.slice(-8)}`)
    .limit(1)
    .single();

  return fuzzy as ContactRow | null;
}

async function createContact(phone: string, name: string): Promise<ContactRow | null> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      phone,
      name,
      ai_enabled: true,
      conversation_status: "open",
    })
    .select("id, phone, name, ai_enabled, unread_count")
    .single();

  if (error) {
    console.error("[Webhook] Error creating contact:", error);
    return null;
  }

  console.log(`[Webhook] New contact created: ${name} (${phone})`);
  return data as ContactRow;
}
