import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendFcmPushServer } from "@/lib/fcmPushServer";

interface PushPayload {
  title: string;
  body: string;
  image?: string;
  url?: string;
  topic?: string;
  userId?: string;
  target?: "all" | "customers" | "sellers" | "new_drops" | "orders" | "user";
  skipInAppSave?: boolean;
}

/**
 * Universal Push Notification Dispatcher (FCM HTTP v1 + In-App Broadcast)
 * Delivers real Android system tray & lockscreen alerts even when app is closed.
 */
export async function POST(req: NextRequest) {
  try {
    const data: PushPayload = await req.json();
    const {
      title,
      body,
      image,
      url = "/notifications",
      topic,
      target = "all",
      userId,
      skipInAppSave = false,
    } = data;

    if (!title || !body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const broadcastId = `msg-${Date.now()}`;

    // 1. Save to in-app broadcast list unless skipped (e.g. already written by Superadmin)
    if (!skipInAppSave && target !== "user") {
      try {
        const { data: existingSettings } = await supabaseServer
          .from("store_settings")
          .select("value")
          .eq("key", "broadcast_messages")
          .maybeSingle();

        const currentBroadcasts = Array.isArray(existingSettings?.value)
          ? existingSettings.value
          : [];
        const newBroadcast = {
          id: broadcastId,
          title: title.trim(),
          message: body.trim(),
          image_url: image || null,
          target_group: target === "sellers" ? "sellers" : "all",
          action_url: url,
          created_at: new Date().toISOString(),
        };

        await supabaseServer.from("store_settings").upsert(
          {
            key: "broadcast_messages",
            value: [newBroadcast, ...currentBroadcasts].slice(0, 50),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

        // Also persist to notifications table so Seller Dashboard & Customer History both receive it
        await supabaseServer.from("notifications").insert({
          title: title.trim(),
          message: body.trim(),
          target_group: target === "sellers" ? "sellers" : target === "customers" ? "customers" : "all",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      } catch (saveErr) {
        console.warn("Notice saving in-app broadcast message:", saveErr);
      }
    }

    // 2. Dispatch real FCM HTTP v1 push notifications to Android devices
    const pushResult = await sendFcmPushServer({
      title: title.trim(),
      body: body.trim(),
      image,
      url,
      tag: broadcastId,
      target,
      userId,
      topic,
    });

    return NextResponse.json({
      success: true,
      configured: pushResult.configured,
      deliveredToDevices: pushResult.deliveredToDevices,
      totalSubscribersFound: pushResult.totalTokens,
      topicSent: pushResult.topicSent,
      inAppBroadcastSaved: !skipInAppSave,
      pushError: pushResult.error || null,
      message: pushResult.configured
        ? `Push dispatched (${pushResult.deliveredToDevices}/${pushResult.totalTokens} devices)`
        : "Saved in-app; add FIREBASE_SERVICE_ACCOUNT_JSON to enable background phone push",
    });
  } catch (err: any) {
    console.error("[Send Push Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
