import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/cachedQueries";

interface PushPayload {
  title: string;
  body: string;
  image?: string;
  url?: string;
  topic?: string;
  userId?: string;
  target?: "all" | "new_drops" | "orders" | "user";
}

/**
 * Universal Push Notification Dispatcher (Flipkart / Meesho Style)
 * Supports:
 * - New Product & Drop Launches
 * - Order Status Updates
 * - Promotional Flash Sales & Teasers
 */
export async function POST(req: NextRequest) {
  try {
    const data: PushPayload = await req.json();
    const { title, body, image, url = "/new-drops", target = "all", userId } = data;

    if (!title || !body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    // 1. Fetch matching device tokens from Supabase
    let query = supabaseServer.from("device_push_tokens").select("token, platform, user_id, topics");

    if (target === "user" && userId) {
      query = query.eq("user_id", userId);
    }

    const { data: subscribers, error: dbError } = await query;

    if (dbError) {
      console.warn("[Push Dispatcher Notice]: device_push_tokens query:", dbError.message);
    }

    const tokens: string[] = (subscribers || [])
      .map((s: any) => s.token)
      .filter((t: any) => typeof t === "string" && t.length > 10);

    // 2. Also save to in-app broadcast notifications table
    try {
      const { data: existingSettings } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "broadcast_messages")
        .maybeSingle();

      const currentBroadcasts = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
      const newBroadcast = {
        id: `msg-${Date.now()}`,
        title,
        message: body,
        image_url: image || null,
        target_group: target === "user" ? "customer" : "all",
        action_url: url,
        created_at: new Date().toISOString(),
      };

      await supabaseServer
        .from("store_settings")
        .upsert(
          {
            key: "broadcast_messages",
            value: [newBroadcast, ...currentBroadcasts].slice(0, 50),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
    } catch (saveErr) {
      console.warn("Notice saving in-app broadcast message:", saveErr);
    }

    // 3. Dispatch to Firebase Cloud Messaging (FCM)
    // Server-side FCM token sending using FCM HTTP v1 / Service Account
    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    let sentCount = 0;

    if (fcmServerKey && tokens.length > 0) {
      try {
        // Legacy FCM HTTP protocol (supported across all FCM projects)
        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            registration_ids: tokens.slice(0, 1000), // Max 1000 per batch
            notification: {
              title,
              body,
              image: image || "https://zebalpha.shop/official-logo.png",
              sound: "default",
              badge: "1",
              click_action: "OPEN_APP",
            },
            data: {
              url,
              title,
              body,
              image: image || "",
            },
            priority: "high",
          }),
        });

        const fcmResult = await fcmResponse.json();
        sentCount = fcmResult.success || 0;
      } catch (fcmErr) {
        console.warn("[FCM Send Notice]:", fcmErr);
      }
    }

    return NextResponse.json({
      success: true,
      deliveredToDevices: sentCount,
      totalSubscribersFound: tokens.length,
      inAppBroadcastSaved: true,
      message: "Notification dispatched successfully",
    });
  } catch (err: any) {
    console.error("[Send Push Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch notification" }, { status: 500 });
  }
}
