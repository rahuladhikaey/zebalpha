import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const userId = searchParams.get("userId");

    let query = supabaseServer.from("order_returns").select("*").order("created_at", { ascending: false });

    if (orderId) {
      query = query.or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("Fetch order returns exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch returns", data: [] }, { status: 500 });
  }
}
