import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

// POST /api/admin/promotions/slots - Update/Upsert a Slot
export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();
    const {
      campaign_id,
      slot_number,
      title,
      price_label,
      image_url,
      destination_type = "category",
      destination_url
    } = body;

    if (!campaign_id) {
      return NextResponse.json({ success: false, message: "Campaign ID is required" }, { status: 400 });
    }

    if (!slot_number || slot_number < 1 || slot_number > 16) {
      return NextResponse.json({ success: false, message: "Slot number must be between 1 and 16" }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: "Slot title is required" }, { status: 400 });
    }

    if (!price_label || !price_label.trim()) {
      return NextResponse.json({ success: false, message: "Price label is required (e.g. 'From ₹69')" }, { status: 400 });
    }

    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ success: false, message: "Image URL is required" }, { status: 400 });
    }

    if (!destination_url || !destination_url.trim()) {
      return NextResponse.json({ success: false, message: "Destination URL is required" }, { status: 400 });
    }

    const slotPayload = {
      campaign_id,
      slot_number,
      title: title.trim(),
      price_label: price_label.trim(),
      image_url: image_url.trim(),
      destination_type,
      destination_url: destination_url.trim(),
      is_active: true,
      updated_at: new Date().toISOString()
    };

    const { data: updatedSlot, error: upsertErr } = await supabaseServer
      .from("promotional_campaign_slots")
      .upsert(slotPayload, { onConflict: "campaign_id,slot_number" })
      .select()
      .single();

    if (upsertErr) {
      console.error("[Promotions Admin Slot Upsert Error]:", upsertErr);
      return NextResponse.json({ success: false, message: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedSlot });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Promotions Admin Slot POST Exception]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
