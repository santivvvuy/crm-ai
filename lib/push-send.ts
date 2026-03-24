// ─── Web Push sender ────────────────────────────────────────────────────────
// Called from the webhook when a new inbound message arrives.
// Sends a push notification to ALL registered devices.

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO ?? "mailto:hola@marketphone.uy",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  tag: string;
  contactId: string;
}) {
  try {
    initWebPush();

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error || !subscriptions || subscriptions.length === 0) return;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
      data: { contactId: payload.contactId },
    });

    // Send to all registered devices in parallel
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        )
      )
    );

    // Remove expired/invalid subscriptions (410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subscriptions[i].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(`[Push] Removed ${expiredEndpoints.length} expired subscriptions`);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[Push] Sent to ${sent}/${subscriptions.length} devices`);
  } catch (err) {
    console.error("[Push] Error sending push:", err);
  }
}
