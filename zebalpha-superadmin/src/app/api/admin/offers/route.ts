import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/admin/offers
export async function GET(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: offerData, error } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "special_offers_bogo")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data: offerData?.value || null });
  } catch (error: any) {
    console.error("Fetch special offer API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/offers
export async function POST(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mainProductId, offerProductIds, isActive } = body;

    if (!mainProductId) {
      return NextResponse.json({ success: false, message: "Missing mainProductId" }, { status: 400 });
    }

    const offerPayload = {
      mainProductId,
      offerProductIds: offerProductIds || [],
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabaseServer
      .from("store_settings")
      .upsert({
        key: "special_offers_bogo",
        value: offerPayload,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({ success: true, data: offerPayload });
  } catch (error: any) {
    console.error("Save special offer API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
