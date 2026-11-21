import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendFcmPushServer, type FcmPushResult } from "@/lib/fcmPushServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      targetGroup = "all",
      actionUrl = "/notifications",
      imageUrl = "",
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: "Title and message are required." },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();
    const cleanMessage = String(message).trim();
    const cleanUrl = String(actionUrl || "/notifications").trim() || "/notifications";
    const cleanImage = String(imageUrl || "").trim() || null;

    const nowIso = new Date().toISOString();
    const newBroadcastItem = {
      id: `bc-${Date.now()}`,
      title: cleanTitle,
      message: cleanMessage,
      action_url: cleanUrl,
      image_url: cleanImage,
      target_group: targetGroup,
      is_active: true,
      created_at: nowIso,
    };

    // 1. Authoritative write to store_settings with service role
    const { data: existing } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "broadcast_messages")
      .maybeSingle();

    const messages = Array.isArray(existing?.value) ? existing.value : [];
    const updated = [newBroadcastItem, ...messages].slice(0, 50);

    const { error: upsertError } = await supabaseServer
      .from("store_settings")
      .upsert(
        {
          key: "broadcast_messages",
          value: updated,
          updated_at: nowIso,
        },
        { onConflict: "key" }
      );

    if (upsertError) {
      console.error("[Broadcast API Error]: store_settings upsert failed:", upsertError);
      return NextResponse.json(
        { success: false, message: "Database write error: " + upsertError.message },
        { status: 500 }
      );
    }

    // 2. Also try writing to notifications table
    try {
      await supabaseServer.from("notifications").insert({
        title: cleanTitle,
        message: cleanMessage,
        target_group: targetGroup,
        is_active: true,
        created_at: nowIso,
      });
    } catch (_) {}

    // 3. Dispatch real Firebase Cloud Messaging (FCM HTTP v1) push notifications to Android phones!
    let pushResult: FcmPushResult = {
      configured: false,
      projectId: null,
      totalTokens: 0,
      deliveredToDevices: 0,
      failedCount: 0,
      topicSent: false,
      prunedInvalidTokens: 0,
    };

    if (targetGroup !== "sellers") {
      try {
        pushResult = await sendFcmPushServer({
          title: cleanTitle,
          body: cleanMessage,
          image: cleanImage,
          url: cleanUrl,
          tag: newBroadcastItem.id,
          target: targetGroup === "customers" ? "customers" : "all",
        });

        // If Superadmin doesn't have Firebase creds locally, try forwarding to Customer storefront dispatcher
        if (!pushResult.configured) {
          const customerBase = (
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.NEXT_PUBLIC_STOREFRONT_URL ||
            "https://zebalpha.shop"
          ).replace(/\/$/, "");
          try {
            const forwardRes = await fetch(`${customerBase}/api/notifications/send-push`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: cleanTitle,
                body: cleanMessage,
                image: cleanImage || undefined,
                url: cleanUrl,
                target: targetGroup === "customers" ? "customers" : "all",
                skipInAppSave: true,
              }),
            });
            if (forwardRes.ok) {
              const fwdJson = await forwardRes.json();
              if (fwdJson?.configured) {
                pushResult = {
                  ...pushResult,
                  configured: true,
                  deliveredToDevices: Number(fwdJson.deliveredToDevices || 0),
                  totalTokens: Number(fwdJson.totalSubscribersFound || 0),
                  topicSent: Boolean(fwdJson.topicSent),
                  error: fwdJson.pushError || undefined,
                };
              }
            }
          } catch (fwdErr) {
            console.warn("[Broadcast API] Customer push relay notice:", fwdErr);
          }
        }
      } catch (pushErr: any) {
        console.error("[Broadcast API] FCM dispatch error:", pushErr);
        pushResult.error = pushErr?.message || "Push dispatch error";
      }
    }

    return NextResponse.json({
      success: true,
      broadcast: newBroadcastItem,
      push: pushResult,
      message: pushResult.configured
        ? `Broadcast sent! Phone push delivered to ${pushResult.deliveredToDevices} device(s)${pushResult.topicSent ? " + FCM topic" : ""}.`
        : "Saved to in-app notifications. Add FIREBASE_SERVICE_ACCOUNT_JSON to enable background phone tray push.",
    });
  } catch (err: any) {
    console.error("[Broadcast API Exception]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
