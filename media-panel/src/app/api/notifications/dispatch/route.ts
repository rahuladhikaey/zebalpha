import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const targetAudience = String(body?.targetAudience || "customers").toLowerCase();

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and message are required." },
        { status: 400 }
      );
    }

    const mappedTarget =
      targetAudience === "sellers"
        ? "sellers"
        : targetAudience === "all"
          ? "all"
          : "customers";

    const storefrontBase = (
      process.env.NEXT_PUBLIC_STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://zebalpha.shop"
    ).replace(/\/$/, "");

    const pushRes = await fetch(`${storefrontBase}/api/notifications/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body: message,
        url: "/notifications",
        target: mappedTarget,
        skipInAppSave: false,
      }),
    });

    const pushJson = await pushRes.json().catch(() => ({}));
    if (!pushRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: pushJson?.error || "Failed to dispatch notification to storefront",
        },
        { status: 502 }
      );
    }

    const deliveredToDevices = Number(pushJson?.deliveredToDevices || 0);
    const totalSubscribersFound = Number(pushJson?.totalSubscribersFound || 0);

    return NextResponse.json({
      success: true,
      deliveredToDevices,
      totalSubscribersFound,
      topicSent: Boolean(pushJson?.topicSent),
      inAppBroadcastSaved: Boolean(pushJson?.inAppBroadcastSaved),
      message: pushJson?.message || "Notification dispatched successfully.",
    });
  } catch (err: any) {
    console.error("[Media Notification Dispatch Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal dispatch error" },
      { status: 500 }
    );
  }
}
